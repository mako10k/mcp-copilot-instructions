# 局所的実装シナリオ: guidance ツール MVP

**作成日**: 2025年12月1日  
**目的**: 最小の動作確認から始め、段階的に機能を育てる

---

## 重要: 用語の定義

本プロジェクトでは、**「ユーザー」が誰を指すか**に注意が必要です。

- **Copilot (LLM)**: 本MCPサーバの**主要利用者**。自らMCPツールを呼び出してコンテキストを管理。
- **人間開発者**: Copilotを使用する実際の開発者。Copilotに指示を出し、最終判断を行う。

**シナリオ内の表現**:
- 「ユーザー」と記載する場合、特に明記がない限り**Copilot (LLM)**を指す。
- 人間開発者を指す場合は「**人間開発者**」と明記する。

---

## シナリオ0: 最小動作確認（現在地）

### 現状
- MCPサーバがstdio通信で起動可能 ✓
- 3ツール（guidance/project_context/instructions_structure）が疑似実装 ✓
- `.vscode/mcp.json`で起動設定完了 ✓

### 次のステップ
`guidance`ツールから実ファイル読み書きを実装し、動作確認。

---

## シナリオ1: guidance ツールの実ファイル連携

### 目標
- `.github/copilot-instructions.md`の存在確認
- 指示書の内容を読み込んで`current-state`として返す
- 指示書が無い場合は「未初期化」を返す

### 実装内容

#### 1. ファイル読み込み関数の追加
```typescript
// server/src/utils/fileSystem.ts
export async function readInstructionsFile(): Promise<string | null> {
  const filePath = path.join(process.cwd(), '../.github/copilot-instructions.md');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
```

#### 2. guidance ツールの更新
```typescript
// server/src/tools/guidance.ts
import { readInstructionsFile } from '../utils/fileSystem';

export async function guidance({ action }: { action: string }) {
  switch (action) {
    case 'overview':
      return 'MCPサーバはCopilot指示書の外部記憶・編集・分析を担うMVPです。';
    
    case 'getting-started':
      return 'ツール: guidance, project_context, instructions_structure。各ツールはactionパラメータでCRUDを切替。';
    
    case 'current-state': {
      const content = await readInstructionsFile();
      if (!content) {
        return 'プロジェクト未初期化: .github/copilot-instructions.md が存在しません。';
      }
      
      // 指示書のメタ情報を抽出（簡易版）
      const lines = content.split('\n').slice(0, 10).join('\n');
      return `指示書確認済み（最初の10行）:\n\n${lines}\n\n... （以下省略）`;
    }
    
    default:
      return `Unknown action: ${action}`;
  }
}
```

### 動作確認手順

1. 指示書が無い状態で`current-state`を実行
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"guidance","arguments":{"action":"current-state"}}}' | npx ts-node src/index.ts 2>/dev/null | tail -1
```

期待結果: `"プロジェクト未初期化: .github/copilot-instructions.md が存在しません。"`

2. 指示書を作成して再実行
```bash
mkdir -p ../.github
echo "# Copilot Instructions MVP" > ../.github/copilot-instructions.md
# 同じコマンドを再実行
```

期待結果: 指示書の最初の10行が表示される

---

## シナリオ2: project_context の永続化（JSON）

### 目標
- `project_context`のCRUD操作を実ファイル（JSON）に永続化
- `.copilot-context/contexts.json`にコンテキストを保存

### 実装内容

#### 1. コンテキストストレージの追加
```typescript
// server/src/utils/contextStorage.ts
interface Context {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const CONTEXT_FILE = path.join(process.cwd(), '../.copilot-context/contexts.json');

export async function loadContexts(): Promise<Context[]> {
  try {
    const content = await fs.readFile(CONTEXT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveContexts(contexts: Context[]): Promise<void> {
  await fs.mkdir(path.dirname(CONTEXT_FILE), { recursive: true });
  await fs.writeFile(CONTEXT_FILE, JSON.stringify(contexts, null, 2));
}
```

#### 2. project_context ツールの更新
```typescript
// server/src/tools/project_context.ts
import { loadContexts, saveContexts } from '../utils/contextStorage';

export async function projectContext({ action, context }: { 
  action: string; 
  context?: any;
}) {
  switch (action) {
    case 'create': {
      const contexts = await loadContexts();
      const newContext = {
        id: `ctx-${Date.now()}`,
        ...context,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      contexts.push(newContext);
      await saveContexts(contexts);
      return `コンテキスト作成: ${newContext.id}`;
    }
    
    case 'read': {
      const contexts = await loadContexts();
      return `コンテキスト一覧 (${contexts.length}件):\n${JSON.stringify(contexts, null, 2)}`;
    }
    
    default:
      return `Unknown action: ${action}`;
  }
}
```

### 動作確認手順

1. コンテキスト作成
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"project_context","arguments":{"action":"create","context":{"category":"architecture","title":"Test","description":"Test context","priority":"high","tags":["test"]}}}}' | npx ts-node src/index.ts 2>/dev/null | tail -1
```

2. `.copilot-context/contexts.json`が作成されたことを確認
```bash
cat ../.copilot-context/contexts.json
```

3. コンテキスト読み取り
```bash
# action=read で確認
```

---

## シナリオ3: instructions_structure の Markdown 読み書き

### 目標
- 指示書のMarkdownをセクション単位で読み取り
- 新規セクション追加や既存セクション更新

### 実装内容（次フェーズ）
- mdast（Markdown AST）を使った構造化編集
- セクション単位のCRUD操作

---

## 実装順序の提案

1. **今すぐ実装**: シナリオ1（guidance ツールの実ファイル連携）
   - 最も影響範囲が小さく、動作確認がシンプル
   
2. **次に実装**: シナリオ2（project_context の永続化）
   - JSON操作で単純、ファイルシステム理解の基盤

3. **最後に実装**: シナリオ3（instructions_structure）
   - Markdown ASTの複雑性があるため、土台確立後に取り組む

---

## 成功基準

### シナリオ1
- [ ] 指示書が無い状態で「未初期化」メッセージ
- [ ] 指示書がある状態で内容の一部を表示
- [ ] エラーハンドリングが適切

### シナリオ2
- [ ] コンテキスト作成でJSONファイルが生成される
- [ ] 複数コンテキストを保存・読み取り可能
- [ ] IDが一意に生成される

### シナリオ3
- [x] Markdownの見出し一覧を取得
- [x] 新規セクションを追加
- [x] 既存セクションを更新

---

## シナリオ4: project_context の完全CRUD

### 目標
- `project_context`にupdate/delete機能を追加
- フィルタ機能（カテゴリ・タグ・優先度範囲）を実装
- 実用レベルのコンテキスト管理を実現

### 実装内容

#### 1. contextStorageにCRUD関数追加
```typescript
// server/src/utils/contextStorage.ts
export async function updateContext(
  id: string,
  updates: Partial<Omit<ProjectContext, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const contexts = await loadContexts();
  const index = contexts.findIndex((ctx) => ctx.id === id);
  if (index === -1) return false;
  
  contexts[index] = {
    ...contexts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await saveContexts(contexts);
  return true;
}

export async function deleteContext(id: string): Promise<boolean> {
  const contexts = await loadContexts();
  const index = contexts.findIndex((ctx) => ctx.id === id);
  if (index === -1) return false;
  
  contexts.splice(index, 1);
  await saveContexts(contexts);
  return true;
}

export async function filterContexts(filters: {
  category?: string;
  tags?: string[];
  minPriority?: number;
  maxPriority?: number;
}): Promise<ProjectContext[]> {
  const contexts = await loadContexts();
  return contexts.filter((ctx) => {
    if (filters.category && ctx.category !== filters.category) return false;
    if (filters.tags && !filters.tags.some((tag) => ctx.tags.includes(tag))) return false;
    if (filters.minPriority && ctx.priority < filters.minPriority) return false;
    if (filters.maxPriority && ctx.priority > filters.maxPriority) return false;
    return true;
  });
}
```

#### 2. project_contextツールにaction追加
```typescript
// server/src/tools/project_context.ts
export async function projectContext(args: ProjectContextArgs) {
  switch (args.action) {
    case 'update': {
      const updates = {}; // action/id以外のフィールドを抽出
      if (args.category !== undefined) updates.category = args.category;
      if (args.title !== undefined) updates.title = args.title;
      // ... 他のフィールド
      
      const success = await updateContext(args.id, updates);
      return success 
        ? `プロジェクト文脈を更新しました。\nID: ${args.id}`
        : `エラー: ID「${args.id}」の文脈が見つかりません。`;
    }
    
    case 'delete': {
      const success = await deleteContext(args.id);
      return success
        ? `プロジェクト文脈を削除しました。\nID: ${args.id}`
        : `エラー: ID「${args.id}」の文脈が見つかりません。`;
    }
    
    case 'read': {
      // フィルタパラメータがある場合はfilterContextsを使用
      if (args.category || args.tags || args.minPriority || args.maxPriority) {
        const filtered = await filterContexts({
          category: args.category,
          tags: args.tags,
          minPriority: args.minPriority,
          maxPriority: args.maxPriority,
        });
        return `フィルタ結果（${filtered.length}件）:\n\n${JSON.stringify(filtered, null, 2)}`;
      }
      // 通常のread処理
    }
  }
}
```

#### 3. index.tsのinputSchema更新
```typescript
// server/src/index.ts
{
  name: 'project_context',
  inputSchema: {
    properties: {
      action: {
        enum: ['create', 'read', 'update', 'delete'],
      },
      id: {
        type: 'string',
        description: 'コンテキストID（update/deleteの場合必須）',
      },
      category: {
        description: 'カテゴリ（create必須、read/updateではフィルタ/更新用）',
      },
      // ... 他のフィールド
      minPriority: {
        type: 'number',
        description: '最小優先度（readでのフィルタ用）',
      },
      maxPriority: {
        type: 'number',
        description: '最大優先度（readでのフィルタ用）',
      },
    },
  },
}
```

### 動作確認手順

1. **Update機能テスト**
```typescript
// 既存コンテキストの優先度とタグを更新
await projectContext({
  action: 'update',
  id: 'ctx-1764564670175-qqahhjb0s',
  priority: 10,
  tags: ['architecture', 'design-principle', 'mcp-server', 'validated']
});
```

2. **Filter機能テスト**
```typescript
// カテゴリでフィルタ
await projectContext({ action: 'read', category: 'constraints' });

// タグでフィルタ
await projectContext({ action: 'read', tags: ['validated'] });

// 優先度範囲でフィルタ
await projectContext({ action: 'read', minPriority: 9, maxPriority: 10 });
```

3. **Delete機能テスト**
```typescript
// テストコンテキスト作成
const { id } = await projectContext({
  action: 'create',
  category: 'test',
  title: 'テストコンテキスト',
  // ...
});

// 削除
await projectContext({ action: 'delete', id });

// 削除確認（存在しないIDでエラー）
await projectContext({ action: 'delete', id: 'ctx-nonexistent' });
```

### 実装メモ

**バグ修正**: update時に`action`フィールドがコンテキストに混入する問題
- 原因: `const { id, action, ...updates } = args;`でTypeScriptの型推論が不完全
- 解決: 明示的にupdatesオブジェクトを構築
```typescript
const updates = {};
if (args.category !== undefined) updates.category = args.category;
// ... 必要なフィールドのみ抽出
```

### 成功基準

- [x] update: 既存コンテキストの部分更新が可能、updatedAtが自動更新される
- [x] delete: IDによる削除が可能、存在しないIDはエラーメッセージ
- [x] filter (category): カテゴリでの絞り込みが正確
- [x] filter (tags): タグ配列のいずれかにマッチする絞り込み
- [x] filter (priority): 優先度範囲での絞り込み
- [x] エラーハンドリング: 存在しないIDに対して適切なエラーメッセージ
- [x] データ整合性: `action`フィールドなど不要なデータが混入しない

---

## シナリオ5: 実プロジェクトでの活用とUX改善

### 目標
- 本プロジェクト自身をMCPツールで管理し、実用性を検証
- 実際の使用感から改善点を発見してフィードバック
- 頻繁に使う操作を最適化してユーザビリティ向上

### 実施内容

#### 1. プロジェクトコンテキストの登録
本プロジェクトの設計原則や実装パターンを`project_context`に登録:

- **constraints**: MCPツールはaction引数でCRUD統一
- **implementation-pattern**: 
  - ファイルI/Oは__dirname基準のパス解決
  - JSON永続化はload/saveで抽象化
  - Markdown編集はunified/remark-parseでAST操作
- **conventions**:
  - データファイルは.gitignoreで除外
  - コンテキストIDはctx-timestamp-randomで一意性保証

#### 2. 指示書の更新
`instructions_structure`で`.github/copilot-instructions.md`に「実装状況」セクションを追加:
- Scenario 1-5の完了状態を記録
- 進行中のタスクを可視化

#### 3. 実用テストで発見した課題

**課題1**: JSON全件表示は情報過多
- 問題: 6件のコンテキストでも画面が埋まる
- 影響: 全体像の把握が困難、IDを探すのに時間がかかる

**課題2**: 頻繁に使う操作の繰り返し入力
- 問題: カテゴリフィルタを何度も指定
- 影響: 同じパラメータを繰り返し入力する手間

#### 4. UX改善の実装

**改善1: サマリー表示形式の追加**

`ReadContextArgs`に`format`オプション追加:
```typescript
interface ReadContextArgs {
  action: 'read';
  // ... 既存のフィルタパラメータ
  format?: 'summary' | 'full';
}
```

**summary形式（デフォルト）**:
```
登録済みプロジェクト文脈（6件）:

1. [constraints] MCPツールはaction引数でCRUD統一 (優先度:10) #architecture #design-principle
   ID: ctx-1764564670175-qqahhjb0s

2. [implementation-pattern] ファイルI/Oは__dirname基準のパス解決 (優先度:8) #file-io
   ID: ctx-1764565588703-5d7a1mrqr
...
```

**full形式**:
- 従来通りのJSON全件表示
- 詳細情報が必要な時のみ`format: 'full'`を指定

#### 5. 実装の効果

**効果測定**:
- サマリー表示: 1画面に収まる情報量（6件 → 15行程度）
- カテゴリフィルタ併用: 必要な情報に素早くアクセス
- ID確認: サマリーの最終行にIDを表示、コピーしやすい

**学んだパターン**:
1. デフォルトは最も頻繁に使うケースに最適化
2. 詳細情報は明示的にリクエストする設計
3. カテゴリ/タグによる分類は実用上必須

### 実用テストの記録

```typescript
// 実際に実行した操作

// 1. プロジェクトコンテキスト6件登録
await projectContext({ action: 'create', category: 'constraints', ... });
await projectContext({ action: 'create', category: 'implementation-pattern', ... });
// ... 計6件

// 2. カテゴリ別確認（サマリー表示が見やすい）
await projectContext({ action: 'read', category: 'implementation-pattern' });
// → 3件のサマリーが簡潔に表示

// 3. 指示書更新
await instructionsStructure({ action: 'update', heading: '実装状況', content: ... });
await instructionsStructure({ action: 'read' });
// → 6セクションに増加

// 4. 知見の記録
await projectContext({
  action: 'create',
  category: 'lessons-learned',
  title: 'read結果のデフォルトはsummary表示が適切',
  ...
});
```

### 得られた知見

#### 知見1: デフォルト動作の重要性
- **Copilot (LLM)**は最も頻繁な操作にパラメータを指定したくない
- `format`のデフォルトを`summary`にすることで、Copilotが即座に使いやすくなる

#### 知見2: フィルタは必須機能
- カテゴリ/タグによる分類がないと、コンテキスト数の増加に対応できない
- 実プロジェクトでは10件以上のコンテキストが普通に発生する

#### 知見3: ツール間連携の実用性
- `project_context`で管理 → `instructions_structure`で参照
- 複数ツールを組み合わせることで、構造化された知識管理が実現

### 成功基準

- [x] 本プロジェクトの制約・原則を`project_context`に登録（6件）
- [x] 指示書に「実装状況」セクション追加、Scenario 1-5記録
- [x] カテゴリフィルタで目的のコンテキストに素早くアクセス
- [x] UX改善: サマリー表示形式をデフォルト化
- [x] 実用テストの知見を`lessons-learned`カテゴリで記録（2件）
- [x] format='full'で詳細情報にアクセス可能

---

## シナリオ6: 外部変更検知と競合管理（Phase 2 - PBI-001 Step 1）

### 目標
- 指示書の外部変更（人間開発者の編集、Git操作等）を自動検知
- 書き込み前にハッシュ値で競合をチェック
- データロスを防ぐ安全機構の実装

### 背景
Phase 1では指示書更新時の競合チェックがなく、以下のリスクがあった:
- 人間開発者が直接編集中にMCPツールが上書き
- Git操作（checkout, merge等）後の不整合
- 複数Copilotセッション間の競合

### 実装内容

#### 1. ファイル状態管理（fileSystem.ts）

**新規インターフェース**:
```typescript
export interface FileState {
  path: string;
  hash: string;        // SHA-256ハッシュ値
  timestamp: number;   // ファイル最終更新時刻（ミリ秒）
}

export interface ConflictInfo {
  message: string;
  expectedHash: string;
  currentHash: string;
  filePath: string;
}
```

**新規関数**:
- `readWithState(filePath)`: ファイル内容とハッシュ・タイムスタンプを返す
- `readInstructionsFileWithState()`: 指示書を状態付きで読み込み
- `writeWithConflictCheck(filePath, content, expectedState)`: 競合チェック付き書き込み
- `writeInstructionsFileWithConflictCheck(content, expectedState)`: 指示書用ラッパー

**実装の特徴**:
- SHA-256ハッシュで内容の同一性を保証
- 書き込み前に現在のハッシュと期待ハッシュを比較
- 不一致時は`success: false`と`conflict`情報を返す

#### 2. Markdown AST層の更新（markdownAst.ts）

**updateSection関数の改修**:
```typescript
// 従来: Promise<void>
// 新版: Promise<{ success: boolean; conflict?: string }>

export async function updateSection(
  heading: string,
  newContent: string
): Promise<{ success: boolean; conflict?: string }> {
  // 1. 状態付きで読み込み
  const result = await readInstructionsFileWithState();
  
  // 2. AST操作
  // ... セクション更新処理 ...
  
  // 3. 競合チェック付きで書き込み
  const writeResult = await writeInstructionsFileWithConflictCheck(
    updatedMarkdown,
    result.state
  );
  
  if (!writeResult.success) {
    return { success: false, conflict: formatConflictMessage(...) };
  }
  
  return { success: true };
}
```

**後方互換性**:
- 従来の`updateSectionLegacy`を残し、既存コードが動作し続けることを保証

#### 3. ツール層の更新（instructions_structure.ts）

**エラーハンドリング追加**:
```typescript
case 'update': {
  const result = await updateSection(args.heading, args.content);
  
  if (!result.success && result.conflict) {
    return `⚠️ 競合エラー: ${result.conflict}`;
  }
  
  return `セクション「${args.heading}」を更新しました。`;
}
```

Copilot (LLM)に対して明確なエラーメッセージを返し、再試行を促す。

### テスト結果

**test-conflict-detection.ts**で以下を検証:

#### テスト1: 正常系（競合なし）
```
✓ セクション更新成功
```
外部変更がない場合、通常通り更新可能。

#### テスト2: 競合検知
```
✓ 競合を正しく検知しました
  期待ハッシュ: 0e5e64e4...
  現在ハッシュ: a3075148...
  メッセージ: 外部変更が検知されました。ファイルが別のプロセスまたは
             人間開発者によって変更されています。
```
ファイル読み込み後に外部変更を加えた場合、ハッシュ不一致を検知。

#### テスト3: updateSection内部の競合回避
```
✓ updateSectionは内部で最新状態を読むため、この順序では競合しません
```
`updateSection`は呼び出し時に最新状態を読むため、関数呼び出し前の外部変更は問題にならない。
**競合が起きるケース**: read → 外部変更 → write（現在は起きない、将来の拡張で考慮）

#### テスト4: エラーハンドリング
適切に例外をキャッチし、エラーメッセージを返す。

### 実装の効果

**安全性向上**:
- データロスリスクの大幅削減
- 人間開発者の編集を保護
- Git操作後の不整合を検知

**運用上の注意**:
- Copilot (LLM)は競合エラー時に再試行が必要
- 人間開発者は指示書更新中にMCPツールを使わないことを推奨
- 将来の拡張: 3-way merge UI、自動リトライ、ロックファイル

### 成功基準

- [x] FileState型とハッシュ計算関数の実装
- [x] readWithState/writeWithConflictCheck関数の実装
- [x] updateSectionの競合チェック対応
- [x] instructions_structureツールでの競合エラー表示
- [x] 4つのテストシナリオすべてパス
- [x] 後方互換性の維持（updateSectionLegacy）

### 発見された課題: 手詰まり問題

**問題**:
現在の実装では、競合検知後に更新が不可能になる:
```
1. Copilot: 指示書を読み込み (hash: ABC)
2. 人間開発者: 指示書を直接編集 (hash: DEF)
3. Copilot: updateSection実行 → 競合エラー ⚠️
4. Copilot: 再試行 → updateSection内部で最新を読むが、
            同じセクションが変更されているため再び競合
5. 🔴 永久に更新できない（人間が手動でマージするしかない）
```

**根本原因**:
- 競合時にエラーを返すだけで、解決手段がない
- 「上書き」は危険で禁止すべき
- 「マージ」の仕組みが必要

### 次のステップ（PBI-001 Step 1.5: 競合マーカー方式）

**設計方針の改訂**:
1. ❌ 強制上書き（force）は禁止 → データロス防止
2. ✅ セクション単位の自動マージ → 異なるセクションなら競合しない
3. ✅ 競合マーカー方式 → Git風の併記で情報保持
4. ✅ Copilot主体の解決 → LLMの理解力を活用

**実装内容**:

#### 1. セクション単位のハッシュ比較
```typescript
// 他セクション変更 → 自動マージ
Copilot: 「実装状況」更新
人間:    「用語の定義」更新
→ 競合なし、両方の変更を統合 ✓

// 同一セクション変更 → 競合マーカー
Copilot: 「実装状況」更新
人間:    「実装状況」更新  
→ 競合マーカー挿入
```

#### 2. 競合マーカーの挿入
```markdown
## 実装状況

<<<<<<< HEAD (外部変更: 2025-12-01T10:30:00Z)
- ✅ Scenario 1-5完了
- 🔄 Scenario 6進行中
=======
- ✅ Scenario 1-6完了  
- ✅ 外部変更検知機能実装済み
>>>>>>> MCP Update (Copilot)
```

#### 3. 新規アクション: detect-conflicts
```typescript
case 'detect-conflicts': {
  // 指示書内の競合マーカーを検出
  const conflicts = await detectConflictMarkers();
  return conflicts.length === 0
    ? '競合はありません。'
    : `${conflicts.length}件の競合:\n` + 
      conflicts.map(c => `- ${c.heading}`).join('\n');
}
```

#### 4. 新規アクション: resolve-conflict
```typescript
case 'resolve-conflict': {
  // 3つの解決戦略
  // - use-head: 外部変更を採用
  // - use-mcp: Copilotの変更を採用
  // - manual: 両方を統合（manualContentで指定）
  await resolveConflict(args.heading, args.resolution, args.manualContent);
  return '競合を解決しました。';
}
```

#### 5. Copilot のワークフロー
```
1. updateSection実行 → conflict返却
2. "競合を検出しました。セクション「XXX」..."
3. 次のターンで指示書を読み直し
4. 競合マーカーを発見 → 両方の内容を理解
5. 判断:
   - 統合可能 → resolve-conflict (manual) で両方を反映
   - 外部変更優先 → resolve-conflict (use-head)
   - 自分優先 → resolve-conflict (use-mcp)
   - 不明 → 人間に確認依頼
```

### 成功基準

- [x] セクション単位のハッシュ計算
- [x] 自動マージ（異なるセクション変更時）
- [x] 競合マーカー挿入（同一セクション変更時）
- [x] detectConflictMarkers関数実装
- [x] resolveConflict関数実装（3つの戦略）
- [x] detect-conflicts/resolve-conflictアクション追加
- [x] テストスクリプトで全シナリオ検証
  - [x] 他セクション変更時の自動マージ
  - [x] 同一セクション変更時の競合検出
  - [x] 競合マーカー検出
  - [x] manual解決
  - [x] use-head解決
  - [x] 競合解決後の確認

### 実装状況: ✅ 完了 (2025-12-01)

**実装詳細**:
- `markdownAst.ts`にセクション単位のハッシュ機能追加
- `updateSection`に初期スナップショット機能追加（外部変更検出）
- 競合マーカーは生テキストで挿入（Markdownパーサーの影響を回避）
- `detectConflictMarkers`で<<<<<<< ... =======  ... >>>>>>>パターン検出
- `resolveConflict`でテキストベース置換（競合マーカー完全削除）
- `instructions_structure`ツールに新アクション追加
- 全6テストシナリオパス確認

**技術的な課題と解決**:
1. Markdownパーサーが競合マーカーを変形 → テキストベース挿入に変更
2. updateSection内での2回読み込みでは外部変更検出不可 → initialSnapshotパラメータ追加
3. resolveConflictでASTベース処理が競合マーカーを削除できず → テキストベース置換に変更

---

## シナリオ7: Git統合 (PBI-001 Step 2)

### 目標
Git管理下での安全性を向上させるため、Git情報を取得・表示する機能を実装。

### 実装内容

#### 1. Git関連ユーティリティ関数
```typescript
// fileSystem.ts
export async function checkGitManaged(filePath: string): Promise<boolean>
export async function getGitCommit(filePath: string): Promise<string | undefined>
export async function getGitStatus(filePath: string): Promise<string | undefined>
export async function getGitDiff(filePath: string): Promise<string | undefined>
```

#### 2. FileState型の拡張
```typescript
export interface FileState {
  path: string;
  hash: string;
  timestamp: number;
  isGitManaged?: boolean;  // 新規
  gitCommit?: string;      // 新規
  gitStatus?: string;      // 新規 (modified, untracked, unmodified等)
}
```

#### 3. readWithStateのGit対応
```typescript
export async function readWithState(
  filePath: string,
  includeGitInfo: boolean = true  // 新規パラメータ
): Promise<{ content: string; state: FileState }>
```

#### 4. instructions_structureにGit情報表示
```typescript
interface ReadStructureArgs {
  action: 'read';
  includeGitInfo?: boolean;  // 新規パラメータ
}
```

表示例:
```
📊 ファイル状態:
  • SHA-256: 0eca8ea9ffb640f7...
  • サイズ: 1872 bytes
  • Git管理: ✓
  • コミット: 2b487302...
  • ステータス: modified
  ⚠️ 未コミットの変更があります
```

### テスト結果
✅ テスト1: Git管理状態の確認  
✅ テスト2: コミットハッシュ取得  
✅ テスト3: Gitステータス確認  
✅ テスト4: Git情報付きreadWithState  
✅ テスト5: readInstructionsFileWithState  
✅ テスト6: ファイル変更後diff検出  
✅ テスト7: 変更後のハッシュ変化検出  

### 実装状況: ✅ 完了 (2025-12-01)

### 成果
- Git管理下のファイル状態を可視化
- 未コミット変更の検知
- コミットハッシュの追跡
- CopilotがGit状態を理解して行動できる基盤を構築

case 'resolve-conflict': {
  heading: string;
  resolution: 'use-head' | 'use-mcp' | 'manual';
  manualContent?: string;  // resolution='manual'の場合
  
  // use-head: 外部変更を採用（HEAD側）
  // use-mcp: Copilot変更を採用（MCP側）
  // manual: Copilot自身が統合した内容を渡す
}
```

#### 5. Copilotの動作フロー
```
1. updateSection実行
2. 同一セクション競合を検知
3. 競合マーカー付きで書き込み
4. 「競合マーカーを追加しました」と通知

（次の会話ターン）
5. Copilot: action='read' で指示書を確認
6. 競合マーカーを発見
7. Copilot: 内容を理解し判断
   - 両方必要 → 統合版を作成
   - 片方で十分 → どちらか選択
   - 判断困難 → 人間開発者に確認を促す
8. action='resolve-conflict' で解決
```

### 成功基準（Step 1.5）

- [ ] セクション単位のハッシュ比較実装
- [ ] 他セクション変更時の自動マージ
- [ ] 競合マーカー挿入機能
- [ ] `detect-conflicts`アクション実装
- [ ] `resolve-conflict`アクション実装（3パターン）
- [ ] テストシナリオ:
  - 自動マージ成功ケース
  - 競合マーカー挿入ケース
  - Copilot主体の解決ケース
  - 人間開発者への確認ケース

### その後のステップ

- **Step 2**: Git状態確認機能（.git存在チェック、git status連携） ✅ 完了
- **Step 3**: 競合時の詳細diff表示（3-way view）
- **Step 4**: 複数Copilotセッション間の排他制御

---

## 追加改善: Git デグレードモード (2025-12-01)

### 概要
Gitコマンドが利用できない環境でも安全に動作するよう、起動時の存在チェックとデグレードモード機能を追加。

### 実装内容

#### Git コマンド存在チェック
```typescript
// fileSystem.ts
let gitAvailable: boolean | undefined = undefined;

async function checkGitAvailable(): Promise<boolean> {
  if (gitAvailable !== undefined) return gitAvailable;
  
  try {
    await execAsync('git --version');
    gitAvailable = true;
    console.log('[fileSystem] Git コマンド利用可能');
  } catch {
    gitAvailable = false;
    console.warn('[fileSystem] Git コマンドが見つかりません。デグレードモードで動作します。');
  }
  
  return gitAvailable;
}
```

#### 全Git関数での統一チェック
- `checkGitManaged()` 
- `getGitCommit()`
- `getGitStatus()`
- `getGitDiff()`

各関数の冒頭で `checkGitAvailable()` を呼び出し、利用不可の場合は早期リターン。

### デグレードモード動作
| 項目 | 通常モード | デグレードモード |
|------|----------|----------------|
| ファイル読み書き | ✓ | ✓ |
| ハッシュ計算 | ✓ | ✓ |
| 競合検知 | ✓ | ✓ |
| `isGitManaged` | true/false | false |
| `gitCommit` | コミットハッシュ | undefined |
| `gitStatus` | modified等 | undefined |
| `gitDiff` | 差分内容 | undefined |

### メリット
- Docker等の軽量環境で動作可能
- Gitがインストールされていない環境でも利用可能
- エラーでクラッシュせず、グレースフルに機能縮退
- コアの競合検知機能（ハッシュベース）は引き続き機能

### テスト結果
✅ 通常モードでの動作確認  
✅ Git情報なしモード（includeGitInfo=false）  
✅ readInstructionsFileWithState  
✅ デグレードモード動作確認  

### 成果
- 環境依存性の軽減
- より広い環境での利用可能性
- ロバスト性の向上
