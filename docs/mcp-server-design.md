# MCP Copilot Instructions Server 設計書

**作成日**: 2025年12月1日  
**バージョン**: 1.0.0

---

## 1. 概要

このMCPサーバは、**LLMのアテンション分散問題を解決**するために、巨大な指示書データベースから現在の文脈に必要な指示だけを動的に抽出し、`.github/copilot-instructions.md`を生成します。

### 1.1 設計思想

**課題**: 開発が進むと指示書が膨大化し、LLMのアテンションが分散して重要な指示が効かなくなる

**解決策**:
```
.copilot-instructions/ (指示書データベース、Git管理)
  ├─ architecture/     # アーキテクチャ関連の指示
  ├─ patterns/         # 設計パターン
  ├─ conventions/      # コーディング規約
  └─ phases/           # 開発フェーズ別の指示
      ↓
MCPサーバ (文脈認識エンジン)
  • ToDoやタスク状態から現在の文脈を把握
  • Gitコミットハッシュと紐付けて状態管理
  • 関連する指示だけをフィルタリング
      ↓
.github/copilot-instructions.md (動的生成)
  • 今必要な指示だけに厳選
  • LLMのアテンションを集中
```

### 1.2 目的

- **アテンション分散の防止**: プロジェクト全体の知識を保持しつつ、LLMには「今の流れ」に必要な指示だけを提供
- **文脈依存の動的生成**: ToDoやタスク状態から、現在のフェーズに適切な指示を自動抽出
- **Git統合**: 指示書データベース全体をGit管理し、コミットハッシュと紐付けて状態を管理
- **LLM主導の自己管理**: Copilot (LLM)自身がMCPツールを呼び出してコンテキストを制御

### 1.3 重要: 用語の定義

本設計書では、**「ユーザー」が2つの意味を持つ**ことに注意が必要です。

- **Copilot (LLM)**: MCPツールの**主要利用者**。`project_context`や`instructions_structure`を自ら呼び出してコンテキストを管理。
- **人間開発者**: Copilotを使用する実際の開発者。Copilotに指示を出し、最終判断を行う。

**文脈による区別**:
- `guidance`, `project_context`, `instructions_structure`: **Copilotが使用**
- `generate_instructions`: **動的フィルタリングによる指示書生成**

### 1.4 設計原則

1. **シンプルさ**: ツール数を最小限に抑え、action引数でCRUD操作を切り替え
2. **階層性**: ローレベル（構造操作）とハイレベル（意味操作）を分離
3. **安全性**: 変更履歴の記録とロールバック機能
4. **効率性**: トークン使用量を最適化し、必要な情報だけを提供
5. **拡張性**: 将来的な機能追加に対応できる設計

---

## 2. ツール設計

### 2.1 ガイダンス系ツール

#### 2.1.1 `guidance`

**目的**: MCPサーバの使い方と現在の状態を**Copilot (LLM)自身**および人間開発者に提供

**パラメータ**:
```typescript
{
  topic?: "overview" | "getting-started" | "best-practices" | "examples" | "current-state"
}
```

**説明**:
- `overview`: サーバの全体像と利用可能なツールの概要
- `getting-started`: 初めて使用する際の手順
- `best-practices`: 効果的な使い方とアンチパターン
- `examples`: 一般的なユースケースとコード例
- `current-state`: 現在のプロジェクト状態と指示書の概要

**戻り値**:
```typescript
{
  topic: string;
  content: string;  // Markdown形式のガイダンス
  relatedTools: string[];  // 関連するツール名のリスト
  nextSteps?: string[];  // 推奨される次のアクション
}
```

---

### 2.2 ローレベルツール

#### 2.2.1 `instructions_structure`

**目的**: 指示書の構造を詳細に操作するためのCRUDツール（@mako10k/mcp-mdast を参考）

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete";
  
  // read時のフィルタリング
  selector?: {
    type?: "heading" | "paragraph" | "list" | "code" | "blockquote";
    level?: number;  // 見出しレベル (1-6)
    path?: string;  // セクションへのパス (例: "1.2.3")
    content?: string;  // コンテンツで検索
  };
  
  // create/update時のデータ
  element?: {
    type: "heading" | "paragraph" | "list" | "code" | "blockquote" | "table";
    level?: number;
    content: string | string[];  // Markdown形式
    position?: "before" | "after" | "first-child" | "last-child";
    anchor?: string;  // 挿入位置の基準となる要素のID or パス
    metadata?: {
      priority?: "high" | "medium" | "low";
      tags?: string[];
      lastUpdated?: string;
    };
  };
  
  // delete時の指定
  target?: string;  // 削除する要素のID or パス
}
```

**説明**:
- Markdown ASTを操作して指示書の構造を直接編集
- セクション、リスト項目、コードブロックなどを精密に制御
- メタデータを付与して優先度やタグ管理が可能

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  affected: {
    id: string;
    path: string;
    type: string;
    preview: string;  // 変更内容のプレビュー
  }[];
  document?: {
    structure: any;  // 現在のAST構造（read時）
    markdown?: string;  // Markdown形式（オプション）
  };
  errors?: string[];
}
```

---

### 2.3 ハイレベルツール

#### 2.3.1 `project_context`

**目的**: プロジェクトのコンテキスト情報を構造化して管理

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete";
  
  // read時のフィルタリング
  filter?: {
    category?: "architecture" | "conventions" | "dependencies" | "patterns" | "constraints";
    tags?: string[];
    priority?: "high" | "medium" | "low";
    updatedAfter?: string;  // ISO 8601形式
  };
  
  // create/update時のデータ
  context?: {
    id?: string;  // update時に必要
    category: "architecture" | "conventions" | "dependencies" | "patterns" | "constraints";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    tags?: string[];
    details?: {
      frameworks?: string[];
      languages?: string[];
      rules?: string[];
      examples?: string[];
      references?: string[];  // URL or ファイルパス
    };
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      author?: string;
      reviewStatus?: "draft" | "reviewed" | "approved";
    };
  };
  
  // delete時の指定
  id?: string;
}
```

**説明**:
- プロジェクトの技術スタック、アーキテクチャパターン、コーディング規約などを管理
- カテゴリ別に整理され、優先度とタグで検索可能
- 変更履歴を自動記録

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  contexts?: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    priority: string;
    tags: string[];
    details: any;
    metadata: any;
  }>;
  summary?: {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    recentChanges: number;
  };
  errors?: string[];
}
```

---

#### 2.3.2 `change_context`

**目的**: 開発の文脈・状態を変更し、それをトリガーに指示書を自動再生成

**パラメータ**:
```typescript
{
  action: "update" | "read" | "reset";
  
  // 更新する状態変数
  state?: {
    phase?: "development" | "refactoring" | "testing" | "debugging" | "documentation";
    focus?: string[];  // 現在のフォーカス（例: ["API認証", "JWT検証"]）
    priority?: "high" | "medium" | "low";  // 現在のタスク優先度
    mode?: "normal" | "strict" | "experimental";  // 動作モード
  };
  
  // 自動的に指示書を再生成するか
  autoRegenerate?: boolean;  // デフォルト: true
}
```

**説明**:
- **軽量**: ToDoツールよりシンプル、Copilotが気軽に呼べる
- **トリガー**: state変更時に自動的に`generate_instructions`を内部実行
- **透過的**: 開発者は「状態を変える」だけで、指示書が最適化される

**使用例**:
```typescript
// リファクタリングフェーズに移行
change_context({
  action: "update",
  state: {
    phase: "refactoring",
    focus: ["コードレビュー指摘対応", "テストカバレッジ向上"]
  }
})
// → 自動的に .github/copilot-instructions.md が再生成される
// → refactoring関連の指示が優先的に含まれる
```

**戻り値**:
```typescript
{
  success: boolean;
  previousState: any;
  currentState: any;
  
  // autoRegenerate=true の場合
  regenerated?: {
    sectionsCount: number;
    changedSections: string[];  // 前回から変わったセクション
    gitCommit: string;
  };
}
```

---

#### 2.3.3 `generate_instructions`

**目的**: 現在の文脈（change_contextで設定された状態、Gitコミット）に基づいて、最適化された指示書を動的に生成

**パラメータ**:
```typescript
{
  action: "generate" | "preview" | "rollback";
  
  // フィルタリング設定（通常は change_context の状態を使用）
  filtering?: {
    categories?: string[];  // 含めるカテゴリ（architecture/patterns/conventions等）
    excludeCategories?: string[];  // 除外するカテゴリ
    maxSections?: number;  // 最大セクション数（デフォルト: 10）
    maxItemsPerSection?: number;  // セクションあたりの最大項目数（デフォルト: 3-4）
  };
  
  // rollback用
  targetCommit?: string;  // 復元先のGitコミットハッシュ
}
```

**注意**: 通常、このツールは**change_contextから自動実行**されるため、直接呼ぶケースは少ない

**説明**:
- **generate**: 現在の文脈から関連する指示を`.copilot-instructions/`から抽出し、`.github/copilot-instructions.md`を生成
- **preview**: 生成される内容をプレビュー（実際には書き込まない）
- **apply**: プレビューした内容を実際に適用
- **rollback**: 特定のGitコミット時点の指示書に戻す

**動的フィルタリングのロジック**:
```typescript
// 例: change_context で phase="development", focus=["API認証", "JWT"] に設定
change_context({
  state: {
    phase: "development",
    focus: ["API認証", "JWT"]
  }
})
↓ 自動的に generate_instructions 実行
↓
必須セクション（required: true）:
  - .copilot-instructions/tools/mcp-server-usage.md
  - .copilot-instructions/conventions/typescript.md
関連セクション（スコアリングで選択）:
  - .copilot-instructions/architecture/api-design.md  (スコア: 18)
  - .copilot-instructions/patterns/security.md        (スコア: 15)
  - .copilot-instructions/phases/development.md       (スコア: 8)
↓
合計: 5セクション → .github/copilot-instructions.md に書き込み
```

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  
  // generate/preview時
  generated?: {
    sections: Array<{
      source: string;  // 元ファイルパス（.copilot-instructions/xxx.md）
      heading: string;
      content: string;
      reason: string;  // なぜこのセクションが選ばれたか
    }>;
    totalSize: number;  // 生成される指示書の総バイト数
    gitCommit: string;  // 紐付けられたGitコミットハッシュ
    context: any;  // 使用された文脈情報
  };
  
  // apply時
  applied?: {
    filePath: string;  // .github/copilot-instructions.md
    sectionsCount: number;
    gitCommit: string;
    backup: string;  // バックアップファイルパス
  };
  
  // rollback時
  rolledBack?: {
    fromCommit: string;
    toCommit: string;
    restoredSections: string[];
  };
  
  errors?: string[];
}
```

**使用例**:
```typescript
// 1. 現在のToDoを基に指示書をプレビュー
generate_instructions({
  action: "preview",
  context: {
    currentTodos: ["PBI-001 Step 3実装", "3-way diff実装"]
  }
})

// 2. 問題なければ適用
generate_instructions({
  action: "apply"
})
```

---

#### 2.3.3 `user_feedback` (将来実装)

**目的**: **人間開発者**の感情、指摘、フィードバックを記録し、対処方法を管理

**注意**: 将来的には`developer_feedback`に改名し、Copilot自身の観察を記録する`copilot_observation`ツールを別途追加する予定。

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete" | "resolve";
  
  // read時のフィルタリング
  filter?: {
    type?: "frustration" | "confusion" | "suggestion" | "praise" | "error-report";
    status?: "new" | "acknowledged" | "in-progress" | "resolved" | "wontfix";
    severity?: "critical" | "high" | "medium" | "low";
    category?: string[];  // 関連カテゴリ
    createdAfter?: string;
  };
  
  // create/update時のデータ
  feedback?: {
    id?: string;  // update時に必要
    type: "frustration" | "confusion" | "suggestion" | "praise" | "error-report";
    severity: "critical" | "high" | "medium" | "low";
    category: string[];  // 例: ["code-generation", "test-writing"]
    description: string;
    context?: {
      task?: string;  // 実行中だったタスク
      copilotResponse?: string;  // Copilotが生成したコード
      expectedBehavior?: string;
      actualBehavior?: string;
      relatedFiles?: string[];
    };
    sentiment?: {
      score: number;  // -1.0 (非常にネガティブ) ～ 1.0 (非常にポジティブ)
      emotion?: "frustrated" | "confused" | "satisfied" | "delighted" | "neutral";
    };
  };
  
  // resolve時の対応記録
  resolution?: {
    feedbackId: string;
    action: "instruction-updated" | "context-added" | "bug-reported" | "documented" | "no-action";
    description: string;
    changes?: string[];  // 行った変更のリスト
    preventionStrategy?: string;  // 今後の予防策
  };
  
  // delete時の指定
  id?: string;
}
```

**説明**:
- **人間開発者**の感情状態とフィードバックを体系的に記録
- 問題パターンを識別し、**Copilotが**指示書への反映を提案
- 解決策と予防策を記録して、同様の問題の再発を防止
- 感情分析により緊急度を自動判定
- **Copilotがフィードバックを読み取り**、自分の挙動を調整

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  
  feedbacks?: Array<{
    id: string;
    type: string;
    severity: string;
    category: string[];
    description: string;
    status: string;
    context: any;
    sentiment: any;
    createdAt: string;
    updatedAt: string;
    resolution?: any;
  }>;
  
  summary?: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    averageSentiment: number;
    trendingIssues: Array<{
      category: string;
      count: number;
      averageSeverity: string;
    }>;
    suggestedActions: Array<{
      priority: string;
      action: string;
      reason: string;
      affectedCategories: string[];
    }>;
  };
  
  errors?: string[];
}
```

---

## 3. データ構造

### 3.1 内部ストレージ構造

```typescript
{
  // メタ情報
  meta: {
    version: string;
    lastUpdated: string;
    projectId: string;
    projectName: string;
  };
  
  // プロジェクトコンテキスト
  contexts: {
    [id: string]: {
      id: string;
      category: string;
      title: string;
      description: string;
      priority: string;
      tags: string[];
      details: any;
      metadata: any;
    };
  };
  
  // 適応的指示の履歴
  adaptiveInstructions: {
    history: Array<{
      id: string;
      version: string;
      timestamp: string;
      scenario: string;
      instructions: string;
      rationale: string;
      active: boolean;
      expiresAt?: string;
    }>;
    current: string;  // 現在有効な指示のID
  };
  
  // ユーザーフィードバック
  feedbacks: {
    [id: string]: {
      id: string;
      type: string;
      severity: string;
      category: string[];
      description: string;
      status: string;
      context: any;
      sentiment: any;
      createdAt: string;
      updatedAt: string;
      resolution?: any;
    };
  };
  
  // 統計情報
  analytics: {
    totalEdits: number;
    lastAnalysis: string;
    effectivenessMetrics: {
      conventionCompliance: number;
      errorReduction: number;
      userSatisfaction: number;
    };
  };
}
```

### 3.2 指示書のメタデータ形式

`.github/copilot-instructions.md`の先頭にHTMLコメントとして埋め込む:

```markdown
<!--
MCP Copilot Instructions Metadata
Version: 1.0.0
Last Updated: 2025-12-01T10:30:00Z
Managed By: mcp-copilot-instructions-server
Active Contexts: ctx-001, ctx-003, ctx-007
Active Adaptive Instruction: adapt-123
-->

# Project Instructions

...
```

---

## 4. 動的指示書生成エンジンの詳細

### 4.1 指示書データベース構造

```
.copilot-instructions/
  ├── _templates/
  │   ├── mcp-tools-usage.md     # 本MCPサーバの使い方（必須テンプレート）
  │   ├── project-setup.md       # プロジェクト固有のセットアップ
  │   └── common-patterns.md     # 共通パターンテンプレート
  ├── architecture/
  │   ├── api-design.md          # API設計の原則
  │   ├── database.md            # データベース設計
  │   └── system-design.md       # システム全体設計
  ├── patterns/
  │   ├── error-handling.md      # エラーハンドリング
  │   ├── testing.md             # テストパターン
  │   └── async-patterns.md      # 非同期処理パターン
  ├── conventions/
  │   ├── typescript.md          # TypeScript規約（常に含む、required: true）
  │   ├── git-workflow.md        # Gitワークフロー
  │   └── naming.md              # 命名規則
  ├── phases/
  │   ├── development.md         # 開発フェーズ固有の指示
  │   ├── refactoring.md
  │   ├── testing.md
  │   └── debugging.md
  ├── tools/
  │   ├── mcp-server-usage.md    # 本MCPサーバの詳細な使い方（required: true）
  │   ├── vscode-shortcuts.md    # VS Codeショートカット
  │   └── git-commands.md        # よく使うGitコマンド
  └── meta.json                  # メタデータ（カテゴリ、タグ、優先度等）
```

各`.md`ファイルは以下のフロントマターを持つ：
```markdown
---
category: architecture
tags: [api, rest, design]
priority: high
phases: [development, refactoring]
related: [patterns/error-handling.md]
---

# API設計の原則

...
```

### 4.2 文脈認識アルゴリズム

```typescript
interface ScoringRules {
  // 基本スコア
  todoKeywordMatch: number;      // デフォルト: 10
  tagMatch: number;              // デフォルト: 5
  phaseMatch: number;            // デフォルト: 8
  filePathMatch: number;         // デフォルト: 7
  
  // 優先度による加算
  priorityHigh: number;          // デフォルト: 3
  priorityMedium: number;        // デフォルト: 1
  
  // 特殊フラグ（これらは常に含める）
  required: number;              // デフォルト: 1000 (事実上必須)
  criticalFeedback: number;      // デフォルト: 500 (人間の強い指摘)
  copilotEssential: number;      // デフォルト: 300 (Copilot判断で必須)
}

function selectRelevantInstructions(
  context: Context,
  rules: ScoringRules = DEFAULT_RULES
): string[] {
  const candidates = loadAllInstructions('.copilot-instructions/');
  
  // 必須フラグが付いているものを先に抽出
  const required = candidates.filter(c => c.metadata.required === true);
  const optional = candidates.filter(c => !c.metadata.required);
  
  const scored = optional.map(instruction => ({
    instruction,
    score: calculateRelevanceScore(instruction, context, rules)
  }));
  
  // 必須 + スコア順で上位を選択
  const selected = [
    ...required,
    ...scored
      .filter(s => s.score > THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SECTIONS - required.length)
      .map(s => s.instruction)
  ];
  
  return selected;
}

// スコアリングルールは .copilot-state/scoring-rules.json で管理
// Copilotや人間開発者が調整可能
```

### 4.3 Gitコミットとの紐付け

```typescript
interface InstructionState {
  gitCommit: string;  // Gitコミットハッシュ
  generatedAt: string;  // 生成日時
  context: Context;  // 使用された文脈
  sections: string[];  // 含まれたセクション
  hash: string;  // 生成された指示書のSHA-256
}

// MCPサーバ内メモリまたは .copilot-state/instructions-history.json に保存
const instructionHistory: Map<string, InstructionState> = new Map();
```

**運用フロー**:
1. `generate_instructions`呼び出し時、現在のGitコミットハッシュを取得
2. 生成された指示書と紐付けて保存
3. Gitコミットが変わったら、自動的に「新しい状態」として認識
4. 外部変更（同じコミットでファイル内容変更）は競合として扱う

### 4.4 Git管理の推奨運用

**推奨**: `.copilot-instructions/` をGit管理下に置く

**メリット**:
- ブランチごとに最適な指示書セット
- レビュー・承認プロセス
- ロールバック・変更履歴
- チーム全体での共有

**非推奨だが対応**: Git非管理
- ハッシュベースの競合検知のみ
- 変更履歴なし
- ロールバック困難

---

## 5. ワークフロー例

### 5.1 初回セットアップ

1. **指示書データベースの作成**
```bash
mkdir -p .copilot-instructions/{architecture,patterns,conventions,phases}
# 各カテゴリにMarkdownファイルを作成
```

2. **プロジェクト情報の登録**
```typescript
project_context({
  action: "create",
  context: {
    category: "architecture",
    title: "API設計原則",
    description: "RESTful API設計のベストプラクティス",
    priority: "high"
  }
})
```

3. **初回指示書生成**
```typescript
generate_instructions({
  action: "preview",
  context: {
    activePhase: "development"
  }
})
// 確認後
generate_instructions({ action: "apply" })
```

### 5.2 日常的な開発フロー

**シナリオ: 新機能開発開始**

1. **開発文脈を設定**（Copilotが軽量ツールを実行）
```typescript
change_context({
  action: "update",
  state: {
    phase: "development",
    focus: ["API認証機能", "JWT トークン検証"],
    priority: "high"
  }
})
// → 自動的に指示書が再生成される
// → 必須: tools/mcp-server-usage.md, conventions/typescript.md
// → 関連: architecture/api-design.md, patterns/security.md, phases/development.md
```

2. **LLMが最適化された指示書で作業**
- `.github/copilot-instructions.md`が自動更新される
- 総セクション数: 5（必須2 + 関連3）
- セクションあたり3-4項目、読みやすい分量
- LLMは「API認証」「JWT」関連の指示に集中

### 5.3 フェーズ切り替え（開発→リファクタリング）

```typescript
change_context({
  action: "update",
  state: {
    phase: "refactoring",
    focus: ["コードレビュー指摘対応", "テストカバレッジ向上"]
  }
})
// → 自動的に指示書が再生成
// → phases/refactoring.md が高スコア
// → architecture/ は低スコア（設計より実装パターン重視）
```

### 5.4 トラブルシューティング

**問題**: 生成された指示書が期待と違う

1. **現在の状態を確認**
```typescript
instructions_structure({
  action: "read",
  includeGitInfo: true
})
```

2. **手動で微調整**
```typescript
instructions_structure({
  action: "update",
  heading: "テスト原則",
  newContent: "...",
  expectedHash: "abc123..."
})
```

3. **指示書データベースを編集**
```bash
vim .copilot-instructions/patterns/testing.md
git add .copilot-instructions/
git commit -m "feat: テスト指示を強化"
```

4. **再生成**
```typescript
generate_instructions({ action: "generate" })
```

---

## 5. セキュリティとプライバシー

### 5.1 データの取り扱い

- **機密情報の除外**: APIキー、パスワード、個人情報は自動検出して記録から除外
- **ローカルストレージ**: すべてのデータはローカルに保存（`.mcp-copilot-instructions/`ディレクトリ）
- **バージョン管理**: 変更履歴は自動でバックアップ（最大30日分）

### 5.2 アクセス制御

- デフォルトでは読み取り専用モード
- 書き込み操作は明示的な確認が必要（設定で変更可能）
- 重要な変更は自動でgitコミット（オプション）

---

## 6. 拡張性

### 6.1 将来の機能候補

1. **チーム連携機能**
   - 複数開発者のフィードバックを統合
   - チーム全体の指示書テンプレート共有

2. **AI分析の高度化**
   - コードレビューコメントから自動的に規約を抽出
   - GitHubのIssue/PRと連携した自動更新

3. **パフォーマンスモニタリング**
   - Copilotの提案受入率の追跡
   - 指示の効果をリアルタイムで測定

4. **マルチプロジェクト対応**
   - 複数プロジェクト間での共通パターンの抽出
   - 組織レベルの標準指示テンプレート

---

## 7. 実装の優先順位

### Phase 1: MVP (Minimum Viable Product) ✅ 完了
- `guidance` - 基本的なガイダンス ✅
- `project_context` (create, read, update, delete) - 完全なCRUD ✅
- `instructions_structure` (read, update) - 基本的な構造操作 ✅
- Git統合 (checkGitManaged, getGitStatus, getGitDiff, getGitCommit) ✅
- 競合検知（ハッシュベース + 競合マーカー） ✅

### Phase 2: 動的指示書生成エンジン 🚧 次の実装対象
- `.copilot-instructions/` ディレクトリ構造の設計と初期テンプレート作成
- `change_context` ツールの実装（軽量な状態変更）
- `generate_instructions` (preview, generate) - 文脈認識とフィルタリング
- フロントマター付きMarkdownのパース
- 柔軟なスコアリングアルゴリズム（required/criticalFeedback/copilotEssential対応）
- `.copilot-state/scoring-rules.json` で調整可能なルール
- GitコミットとInstructionStateの紐付け
- maxSections=10, maxItemsPerSection=3-4 の制約

### Phase 3: Advanced Features
- `generate_instructions` (rollback) - Git履歴を使ったロールバック
- ブランチ戦略との統合（feature/xxx → 関連指示のみ、`.copilot-instructions/branches/`）
- `instructions_structure` (create, delete) - 完全なCRUD
- 統計とアナリティクス機能（指示の効果測定、スコアリングルールの自動調整）
- `developer_feedback` ツール（人間開発者の強い指摘を記録 → criticalFeedback フラグ自動付与）

---

## 8. まとめ

このMCPサーバは、**LLMのアテンション分散問題**を根本的に解決するために、巨大な指示書データベースから文脈に応じて必要な指示だけを動的に生成します。

**主な特徴**:
- ✅ **アテンション集中**: 膨大な知識を保持しつつ、LLMには「今必要な指示だけ」を提供
- ✅ **文脈認識**: ToDo管理や開発フェーズから現在の状況を把握
- ✅ **Git統合**: コミットハッシュと紐付けて状態管理、変更履歴・ロールバック対応
- ✅ **動的フィルタリング**: スコアリングアルゴリズムで関連指示を自動抽出
- ✅ **action引数によるCRUD統一**: シンプルで一貫したAPI設計
- ✅ **安全性**: 競合検知、競合マーカー、デグレードモード対応

**設計思想の核心**:
```
問題: ガチガチに追記 → 指示書肥大化 → アテンション分散 → 効果減少
解決: 大きな構造を持ちつつ、文脈に応じて絞って出す
結果: LLMは常に「今の流れに必要な指示」に集中できる
```

次のステップ: Phase 2（動的指示書生成エンジン）の実装開始
