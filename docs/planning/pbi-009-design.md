# PBI-009: onboardingツール 設計ドキュメント

**作成日**: 2025-12-01  
**ステータス**: 設計フェーズ

## 1. guidanceとの統合可否分析

### 結論: 別ツールとして独立（疎結合な連携）

#### 判断理由

**Option A: guidanceに統合** ❌
- ❌ 責務の肥大化（情報提供→導入管理）
- ❌ アクション数増加（3→9）
- ❌ 概念の不一致（guidance=ガイド vs onboarding=状態管理）
- ❌ 既存ユーザーの混乱

**Option B: 別ツールとして独立** ✅
- ✅ 単一責任の原則（SRP）
- ✅ guidanceは情報提供に専念
- ✅ onboardingは導入プロセスに専念
- ✅ 将来の拡張性
- ✅ テスタビリティ

### 連携アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                   MCPサーバ起動                      │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│           onboardingStatusManager.ts                 │
│  - 状態ファイル: .copilot-state/onboarding.json     │
│  - getStatus(): OnboardingStatus                     │
│  - isRestricted(): boolean                           │
└─────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                    ↓
┌──────────────────┐              ┌──────────────────┐
│   guidance.ts    │              │  onboarding.ts   │
│  - 状態を参照    │              │  - 状態を変更    │
│  - 案内メッセージ│              │  - 分析・提案    │
│  - 制限モード表示│              │  - 実行・検証    │
└──────────────────┘              └──────────────────┘
        ↓                                    ↓
┌─────────────────────────────────────────────────────┐
│          その他のツール（instructions_structure等）   │
│          - 状態を参照して動作制御                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. 状態管理の設計

### オンボーディング状態ファイル

**パス**: `.copilot-state/onboarding.json`

```typescript
interface OnboardingStatus {
  version: string;                    // スキーマバージョン（"1.0.0"）
  status: 'not_started'               // 未開始
        | 'analyzed'                  // 分析済み
        | 'proposed'                  // 提案済み
        | 'approved'                  // 承認済み
        | 'completed'                 // 完了
        | 'rejected'                  // 拒否
        | 'skipped';                  // スキップ
  
  pattern?: 'clean'                   // 指示書なし
          | 'structured'              // 構造化済み（互換）
          | 'unstructured'            // 非構造化
          | 'messy';                  // めちゃくちゃ
  
  analyzedAt?: string;                // ISO 8601 timestamp
  decidedAt?: string;                 // ユーザー判断日時
  migratedAt?: string;                // マイグレーション実行日時
  
  problems?: Array<{                  // 検出された問題
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  
  backupPath?: string;                // バックアップファイルパス
  canRollback: boolean;               // ロールバック可否
  rollbackUntil?: string;             // ロールバック期限
  
  restrictedMode: boolean;            // 機能制限モード
}
```

**初期状態（存在しない場合）**:
```json
{
  "version": "1.0.0",
  "status": "not_started",
  "canRollback": false,
  "restrictedMode": false
}
```

---

## 3. 実装フェーズ詳細

### Phase A: 検出と分析（優先度: 🔴 Critical）

#### 3.1. ファイル構成

```
server/src/
├── tools/
│   └── onboarding.ts              # メインツール実装
├── utils/
│   ├── onboardingStatusManager.ts # 状態管理
│   └── instructionsAnalyzer.ts    # 分析ロジック
└── index.ts                       # ツール登録
```

#### 3.2. onboardingStatusManager.ts

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

const STATUS_FILE = '.copilot-state/onboarding.json';

export interface OnboardingStatus {
  version: string;
  status: 'not_started' | 'analyzed' | 'proposed' | 'approved' 
        | 'completed' | 'rejected' | 'skipped';
  pattern?: 'clean' | 'structured' | 'unstructured' | 'messy';
  analyzedAt?: string;
  decidedAt?: string;
  migratedAt?: string;
  problems?: Array<{
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  backupPath?: string;
  canRollback: boolean;
  rollbackUntil?: string;
  restrictedMode: boolean;
}

/**
 * オンボーディング状態を取得
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const content = await fs.readFile(STATUS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // ファイルが存在しない場合は初期状態
    return {
      version: '1.0.0',
      status: 'not_started',
      canRollback: false,
      restrictedMode: false
    };
  }
}

/**
 * オンボーディング状態を保存
 */
export async function saveOnboardingStatus(status: OnboardingStatus): Promise<void> {
  const dir = path.dirname(STATUS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

/**
 * 機能制限モードかどうか
 */
export async function isRestrictedMode(): Promise<boolean> {
  const status = await getOnboardingStatus();
  return status.restrictedMode;
}

/**
 * オンボーディング完了済みか
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  const status = await getOnboardingStatus();
  return status.status === 'completed' || status.status === 'skipped';
}
```

#### 3.3. instructionsAnalyzer.ts

```typescript
import { readInstructionsFile } from './fileSystem';

export interface AnalysisResult {
  exists: boolean;
  pattern: 'clean' | 'structured' | 'unstructured' | 'messy';
  
  structured?: {
    sections: Array<{ heading: string; lineCount: number; startLine: number }>;
    compatible: boolean;
  };
  
  unstructured?: {
    contentLength: number;
    lineCount: number;
    suggestedSections: Array<{
      heading: string;
      content: string;
      confidence: number; // 0-1
    }>;
  };
  
  problems?: Array<{
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  
  recommendation: string;
}

/**
 * 既存指示書を分析
 */
export async function analyzeInstructions(): Promise<AnalysisResult> {
  const content = await readInstructionsFile();
  
  // パターン1: 指示書が存在しない（クリーン）
  if (!content) {
    return {
      exists: false,
      pattern: 'clean',
      recommendation: '新規作成できます。そのまま利用を開始してください。'
    };
  }
  
  const lines = content.split('\n');
  
  // パターン2: 構造化済み（## セクション形式）
  const sections = extractSections(content);
  if (sections.length > 0) {
    return {
      exists: true,
      pattern: 'structured',
      structured: {
        sections: sections.map(s => ({
          heading: s.heading,
          lineCount: s.lines.length,
          startLine: s.startLine
        })),
        compatible: true
      },
      recommendation: '既存の指示書を検出しました。そのまま利用できます。'
    };
  }
  
  // パターン3 or 4の判定: 問題検出
  const problems = detectProblems(content, lines);
  
  if (problems.length > 0) {
    // パターン4: めちゃくちゃ（矛盾・重複あり）
    return {
      exists: true,
      pattern: 'messy',
      problems,
      recommendation: '矛盾や重複が検出されました。手動での整理をお勧めします。'
    };
  }
  
  // パターン3: 非構造化（問題はないが整理されていない）
  const suggested = suggestSections(content);
  return {
    exists: true,
    pattern: 'unstructured',
    unstructured: {
      contentLength: content.length,
      lineCount: lines.length,
      suggestedSections: suggested
    },
    recommendation: '構造化することで管理しやすくなります。提案を確認しますか？'
  };
}

/**
 * セクション抽出（## で始まる行）
 */
function extractSections(content: string): Array<{
  heading: string;
  lines: string[];
  startLine: number;
}> {
  const lines = content.split('\n');
  const sections: Array<{ heading: string; lines: string[]; startLine: number }> = [];
  let currentSection: { heading: string; lines: string[]; startLine: number } | null = null;
  
  lines.forEach((line, index) => {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: match[1].trim(),
        lines: [],
        startLine: index + 1
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  });
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * 問題検出（矛盾・重複）
 */
function detectProblems(content: string, lines: string[]): Array<{
  type: 'contradiction' | 'duplication' | 'unclear';
  description: string;
  locations: Array<{ line: number; text: string }>;
}> {
  const problems: Array<{
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }> = [];
  
  // 重複セクション検出
  const headings = new Map<string, number[]>();
  lines.forEach((line, index) => {
    const match = line.match(/^## (.+)$/);
    if (match) {
      const heading = match[1].trim().toLowerCase();
      if (!headings.has(heading)) {
        headings.set(heading, []);
      }
      headings.get(heading)!.push(index + 1);
    }
  });
  
  headings.forEach((lineNumbers, heading) => {
    if (lineNumbers.length > 1) {
      problems.push({
        type: 'duplication',
        description: `重複セクション: "${heading}"`,
        locations: lineNumbers.map(line => ({
          line,
          text: lines[line - 1]
        }))
      });
    }
  });
  
  // 矛盾検出（シンプルなキーワードベース）
  const contradictionPatterns = [
    { positive: /any.*禁止|anyを?使わない|any.*NG/i, negative: /any.*OK|anyを?使[うえ]|any.*許可/i, term: 'any型の使用' },
    { positive: /camelCase/i, negative: /snake_case/i, term: '命名規則（camelCase vs snake_case）' },
    { positive: /Jest/i, negative: /Vitest/i, term: 'テストフレームワーク（Jest vs Vitest）' }
  ];
  
  contradictionPatterns.forEach(pattern => {
    const positiveLines: number[] = [];
    const negativeLines: number[] = [];
    
    lines.forEach((line, index) => {
      if (pattern.positive.test(line)) positiveLines.push(index + 1);
      if (pattern.negative.test(line)) negativeLines.push(index + 1);
    });
    
    if (positiveLines.length > 0 && negativeLines.length > 0) {
      problems.push({
        type: 'contradiction',
        description: `矛盾: ${pattern.term}`,
        locations: [
          ...positiveLines.map(line => ({ line, text: lines[line - 1] })),
          ...negativeLines.map(line => ({ line, text: lines[line - 1] }))
        ]
      });
    }
  });
  
  return problems;
}

/**
 * セクション提案（非構造化コンテンツ向け）
 * 
 * 注: 本格的な実装ではLLM活用が望ましいが、
 * ここではシンプルなキーワードベースで実装
 */
function suggestSections(content: string): Array<{
  heading: string;
  content: string;
  confidence: number;
}> {
  const suggestions: Array<{ heading: string; content: string; confidence: number }> = [];
  const lines = content.split('\n');
  
  // キーワードベースの分類
  const keywords = {
    'TypeScript規約': /typescript|型|type|interface|any|unknown/i,
    'テストパターン': /test|jest|vitest|spec|coverage|テスト/i,
    '命名規則': /命名|camelCase|snake_case|PascalCase|変数名|関数名/i,
    'コーディング規約': /規約|convention|eslint|prettier|lint/i
  };
  
  const contentBySection = new Map<string, string[]>();
  
  lines.forEach(line => {
    Object.entries(keywords).forEach(([section, pattern]) => {
      if (pattern.test(line)) {
        if (!contentBySection.has(section)) {
          contentBySection.set(section, []);
        }
        contentBySection.get(section)!.push(line);
      }
    });
  });
  
  contentBySection.forEach((lines, heading) => {
    suggestions.push({
      heading,
      content: lines.join('\n'),
      confidence: Math.min(0.9, 0.5 + lines.length * 0.1) // 行数で信頼度を調整
    });
  });
  
  // 分類できなかった行は「その他」に
  const categorizedLines = new Set<string>();
  contentBySection.forEach(lines => {
    lines.forEach(line => categorizedLines.add(line));
  });
  
  const uncategorized = lines.filter(line => 
    line.trim() && !categorizedLines.has(line)
  );
  
  if (uncategorized.length > 0) {
    suggestions.push({
      heading: 'その他',
      content: uncategorized.join('\n'),
      confidence: 0.3
    });
  }
  
  return suggestions;
}
```

#### 3.4. onboarding.ts（analyzeアクション）

```typescript
import { 
  getOnboardingStatus, 
  saveOnboardingStatus, 
  OnboardingStatus 
} from '../utils/onboardingStatusManager';
import { analyzeInstructions } from '../utils/instructionsAnalyzer';

interface OnboardingArgs {
  action: 'analyze' | 'propose' | 'approve' | 'migrate' | 'rollback' | 'status';
  // 他のアクション用のパラメータは後で追加
}

export async function onboarding(args: OnboardingArgs): Promise<string> {
  switch (args.action) {
    case 'analyze': {
      const analysis = await analyzeInstructions();
      const status = await getOnboardingStatus();
      
      // 状態を更新
      const newStatus: OnboardingStatus = {
        ...status,
        status: 'analyzed',
        pattern: analysis.pattern,
        analyzedAt: new Date().toISOString(),
        problems: analysis.problems,
        restrictedMode: analysis.pattern === 'messy' || analysis.pattern === 'unstructured'
      };
      
      await saveOnboardingStatus(newStatus);
      
      // 結果を整形して返す
      return formatAnalysisResult(analysis);
    }
    
    case 'status': {
      const status = await getOnboardingStatus();
      return formatStatus(status);
    }
    
    default:
      return `未実装のアクション: ${args.action}`;
  }
}

function formatAnalysisResult(analysis: any): string {
  let result = '📊 既存指示書の分析結果\n\n';
  
  switch (analysis.pattern) {
    case 'clean':
      result += '✅ パターン: クリーン導入\n';
      result += '指示書が存在しません。新規作成できます。\n\n';
      result += '次のステップ: そのまま利用を開始してください。';
      break;
      
    case 'structured':
      result += '✅ パターン: 構造化済み\n';
      result += `${analysis.structured.sections.length}個のセクションを検出しました。\n\n`;
      result += '【セクション一覧】\n';
      analysis.structured.sections.forEach((s: any) => {
        result += `- ${s.heading} (${s.lineCount}行, Line ${s.startLine}〜)\n`;
      });
      result += '\n✓ このMCPサーバと互換性があります。\n';
      result += '次のステップ: そのまま利用できます。';
      break;
      
    case 'unstructured':
      result += '⚠️ パターン: 非構造化\n';
      result += `全${analysis.unstructured.lineCount}行（${analysis.unstructured.contentLength}文字）\n\n`;
      result += '構造化することで以下のメリットがあります:\n';
      result += '- セクション単位での更新・管理\n';
      result += '- 競合検出と自動解決\n';
      result += '- 履歴管理とロールバック\n\n';
      result += '【提案するセクション】\n';
      analysis.unstructured.suggestedSections.forEach((s: any) => {
        const conf = Math.round(s.confidence * 100);
        result += `- ${s.heading} (信頼度: ${conf}%)\n`;
      });
      result += '\n次のステップ: 提案を確認するには\n';
      result += '  onboarding({ action: "propose" })';
      break;
      
    case 'messy':
      result += '🔴 パターン: 問題あり\n\n';
      result += '以下の問題が検出されました:\n\n';
      analysis.problems.forEach((p: any) => {
        result += `【${p.type === 'contradiction' ? '矛盾' : p.type === 'duplication' ? '重複' : '不明瞭'}】\n`;
        result += `${p.description}\n`;
        p.locations.forEach((loc: any) => {
          result += `  Line ${loc.line}: ${loc.text.substring(0, 50)}...\n`;
        });
        result += '\n';
      });
      result += '⚠️ 自動処理できません。手動での整理をお勧めします。\n\n';
      result += '次のステップ:\n';
      result += '1. 上記の問題を手動で修正\n';
      result += '2. 再分析: onboarding({ action: "analyze" })\n\n';
      result += '現在は読み取り専用モードで動作します。';
      break;
  }
  
  return result;
}

function formatStatus(status: OnboardingStatus): string {
  let result = '📋 オンボーディング状態\n\n';
  result += `ステータス: ${status.status}\n`;
  
  if (status.pattern) {
    result += `パターン: ${status.pattern}\n`;
  }
  
  if (status.analyzedAt) {
    result += `分析日時: ${new Date(status.analyzedAt).toLocaleString('ja-JP')}\n`;
  }
  
  result += `機能制限モード: ${status.restrictedMode ? 'ON' : 'OFF'}\n`;
  
  if (status.restrictedMode) {
    result += '\n【利用可能な機能】\n';
    result += '- ✅ guidance (ガイド表示)\n';
    result += '- ✅ instructions_structure: read (読み取りのみ)\n';
    result += '- ✅ project_context (プロジェクト文脈)\n';
    result += '- ✅ feedback (フィードバック)\n\n';
    result += '【制限される機能】\n';
    result += '- ❌ instructions_structure: update/delete/insert\n';
    result += '- ❌ change_context (動的生成)\n';
  }
  
  if (status.canRollback) {
    result += `\nロールバック可能: ${status.rollbackUntil}まで\n`;
    result += `バックアップ: ${status.backupPath}\n`;
  }
  
  return result;
}
```

---

### Phase D: 機能制限モード（優先度: 🔴 Critical）

#### 3.5. instructions_structure.tsの制限

```typescript
// instructions_structure.ts の冒頭に追加
import { isRestrictedMode } from '../utils/onboardingStatusManager';

export async function instructionsStructure(args: InstructionsStructureArgs): Promise<string> {
  // 機能制限モードのチェック
  if (args.action !== 'read' && args.action !== 'detect-conflicts') {
    const restricted = await isRestrictedMode();
    if (restricted) {
      return '❌ 機能制限モード: このアクションは利用できません。\n\n' +
             'オンボーディングを完了するか、読み取り専用モードで使用してください。\n' +
             '詳細: onboarding({ action: "status" })';
    }
  }
  
  // 既存の処理
  switch (args.action) {
    // ...
  }
}
```

#### 3.6. change_context.tsの制限

```typescript
// change_context.ts の冒頭に追加
import { isRestrictedMode } from '../utils/onboardingStatusManager';

export async function changeContext(args: ChangeContextArgs): Promise<string> {
  // 機能制限モードのチェック（readは許可）
  if (args.action !== 'read' && args.action !== 'list-history' && args.action !== 'show-diff') {
    const restricted = await isRestrictedMode();
    if (restricted) {
      return '❌ 機能制限モード: このアクションは利用できません。\n\n' +
             'change_contextは指示書を変更するため、オンボーディング完了後に利用できます。\n' +
             '詳細: onboarding({ action: "status" })';
    }
  }
  
  // 既存の処理
  switch (args.action) {
    // ...
  }
}
```

#### 3.7. guidance.tsの拡張

```typescript
import { readInstructionsFile } from '../utils/fileSystem';
import { getOnboardingStatus } from '../utils/onboardingStatusManager';

export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCPサーバはCopilot指示書の外部記憶・編集・分析を担うMVPです。';
      
    case 'getting-started':
      return 'src/index.tsでguidance, project_context, instructions_structureをCLIで呼び出せます。';
      
    case 'current-state': {
      // オンボーディング状態を確認
      const onboardingStatus = await getOnboardingStatus();
      
      let result = '📊 現在の状態\n\n';
      
      // オンボーディング状態の表示
      result += `【オンボーディング】\n`;
      result += `ステータス: ${onboardingStatus.status}\n`;
      if (onboardingStatus.pattern) {
        result += `パターン: ${onboardingStatus.pattern}\n`;
      }
      result += `機能制限モード: ${onboardingStatus.restrictedMode ? 'ON' : 'OFF'}\n\n`;
      
      if (onboardingStatus.restrictedMode) {
        result += '⚠️ 一部機能が制限されています。\n';
        result += '詳細: onboarding({ action: "status" })\n\n';
      }
      
      // 指示書の状態
      const content = await readInstructionsFile();
      if (!content) {
        result += '【指示書】\n';
        result += '未初期化です。.github/copilot-instructions.md を作成してください。\n';
        
        if (onboardingStatus.status === 'not_started') {
          result += '\n初回セットアップ: onboarding({ action: "analyze" })';
        }
      } else {
        const lines = content.split('\n');
        const preview = lines.slice(0, 10).join('\n');
        const totalLines = lines.length;
        
        result += `【指示書】\n`;
        result += `全${totalLines}行\n\n`;
        result += `[先頭10行プレビュー]\n${preview}\n\n...`;
      }
      
      return result;
    }
    
    default:
      return `Unknown action: ${action}`;
  }
}
```

---

## 4. 実装計画

### Step 1: 基盤構築（Phase A + Phase D）🔴 Critical

**作業項目**:
1. ✅ 設計ドキュメント作成（このファイル）
2. [ ] `onboardingStatusManager.ts` 実装（100行）
3. [ ] `instructionsAnalyzer.ts` 実装（250行）
   - extractSections
   - detectProblems
   - suggestSections
4. [ ] `onboarding.ts` 実装（150行）
   - analyze アクション
   - status アクション
5. [ ] index.ts にonboardingツール登録（30行）
6. [ ] instructions_structure.ts に制限チェック追加（10行）
7. [ ] change_context.ts に制限チェック追加（10行）
8. [ ] guidance.ts 拡張（30行）
9. [ ] テストスクリプト作成（test-onboarding-phase-a.ts, 150行）

**見積もり**: 730行、実装時間 3-4時間

**完了基準**:
- [ ] 4パターンの分類が正しく動作
- [ ] 問題検出（矛盾・重複）が動作
- [ ] 機能制限モードが動作
- [ ] guidanceが状態を表示

### Step 2: マイグレーション機能（Phase B + Phase C）🟡 High

**作業項目**:
1. [ ] propose アクション実装（100行）
2. [ ] approve アクション実装（50行）
3. [ ] migrate アクション実装（150行）
4. [ ] rollback アクション実装（80行）
5. [ ] テストスクリプト作成（test-onboarding-phase-bc.ts, 200行）

**見積もり**: 580行、実装時間 2-3時間

**完了基準**:
- [ ] マイグレーション提案が表示される
- [ ] バックアップが作成される
- [ ] マイグレーションが実行される
- [ ] ロールバックが動作する

---

## 5. テスト計画

### 5.1. Phase A テストシナリオ

```typescript
// test-onboarding-phase-a.ts

Test 1: パターン1（クリーン導入）
- 前提: .github/copilot-instructions.md が存在しない
- 実行: onboarding({ action: 'analyze' })
- 期待: pattern='clean', restrictedMode=false

Test 2: パターン2（構造化済み）
- 前提: ## セクション形式の指示書がある
- 実行: onboarding({ action: 'analyze' })
- 期待: pattern='structured', sections配列が返る, restrictedMode=false

Test 3: パターン3（非構造化）
- 前提: フリーフォーマットの指示書がある
- 実行: onboarding({ action: 'analyze' })
- 期待: pattern='unstructured', suggestedSections配列が返る, restrictedMode=true

Test 4: パターン4（めちゃくちゃ）
- 前提: 矛盾・重複のある指示書がある
- 実行: onboarding({ action: 'analyze' })
- 期待: pattern='messy', problems配列が返る, restrictedMode=true

Test 5: 機能制限モード（update制限）
- 前提: restrictedMode=true
- 実行: instructions_structure({ action: 'update', ... })
- 期待: エラーメッセージ、実行されない

Test 6: 機能制限モード（read許可）
- 前提: restrictedMode=true
- 実行: instructions_structure({ action: 'read' })
- 期待: 正常に実行される

Test 7: guidanceでの状態表示
- 前提: analyze実行済み
- 実行: guidance({ action: 'current-state' })
- 期待: オンボーディング状態が表示される
```

---

## 6. ユーザーエクスペリエンスフロー

### シナリオ: 非構造化指示書の導入

```
【初回実行】
User: 「このMCPサーバを使いたい」

Copilot: guidance({ action: 'current-state' })
         → 「初回セットアップ: onboarding({ action: "analyze" })」

User: (analyzeを実行)

Copilot: 「⚠️ パターン: 非構造化
         構造化することで管理しやすくなります。
         
         【提案するセクション】
         - TypeScript規約 (信頼度: 80%)
         - テストパターン (信頼度: 70%)
         ...
         
         次のステップ: 提案を確認するには
           onboarding({ action: "propose" })」

【現時点での動作】
User: 「指示書を更新したい」

Copilot: instructions_structure({ action: 'update', ... })
         → 「❌ 機能制限モード: このアクションは利用できません。
            
            オンボーディングを完了するか、読み取り専用モードで使用してください。
            詳細: onboarding({ action: "status" })」

User: (statusを確認)

Copilot: 「📋 オンボーディング状態
         
         ステータス: analyzed
         パターン: unstructured
         機能制限モード: ON
         
         【利用可能な機能】
         - ✅ guidance
         - ✅ instructions_structure: read
         ...」
```

---

## 7. 次のステップ

### 今すぐ実装すべき（Phase A + D）:
1. onboardingStatusManager.ts
2. instructionsAnalyzer.ts
3. onboarding.ts（analyze, status のみ）
4. 機能制限チェック（instructions_structure, change_context）
5. guidance拡張
6. テスト

### 後で実装（Phase B + C）:
1. propose アクション
2. approve アクション
3. migrate アクション
4. rollback アクション

---

## 8. FAQ

**Q: なぜguidanceと統合しないのか？**
A: 単一責任の原則。guidanceは情報提供、onboardingは状態管理と実行。
   別々にすることで、テストしやすく、将来の拡張性も高い。

**Q: 機能制限モードは厳しすぎないか？**
A: ユーザーの既存資産を守るための安全策。読み取り専用なら問題なく使える。
   承認後は通常モードになるので、一時的な制限。

**Q: LLMを使った分析は？**
A: Phase Aではシンプルなキーワードベースで実装。
   将来的にはLLM活用でより高精度な分析が可能。

---

## 9. 実装状況

- [ ] Phase A: 検出と分析
- [ ] Phase D: 機能制限モード
- [ ] Phase B: マイグレーション提案
- [ ] Phase C: 安全な実行

**開始日**: 2025-12-01  
**目標完了日（Phase A+D）**: 2025-12-01（同日）
