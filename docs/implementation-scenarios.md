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

---

## シナリオ8: 動的指示書生成（Phase 2開始）

**日付**: 2025年12月1日  
**目的**: LLMのアテンション分散問題を解決する動的指示書生成エンジンの実装

### 課題背景
- 開発が進むと指示書が肥大化 → LLMのアテンションが分散
- 重要な指示が効かなくなる
- 「今の流れに必要な指示だけ」を提供する仕組みが必要

### 実装内容

#### 1. `.copilot-instructions/` ディレクトリ構造
```
.copilot-instructions/
  ├── _templates/        # MCPツール使い方テンプレート
  ├── tools/             # mcp-server-usage.md (required: true)
  ├── architecture/      # api-design.md等
  ├── patterns/          # error-handling.md, testing.md等
  ├── conventions/       # typescript.md (required: true), git-workflow.md
  └── phases/            # development.md, refactoring.md, debugging.md
```

**フロントマター形式**:
```yaml
---
category: conventions
tags: [typescript, coding-style]
priority: high
required: true  # 常に含める場合
phases: [development, refactoring]
---
```

#### 2. スコアリングルール（`.copilot-state/scoring-rules.json`）
```json
{
  "rules": {
    "focusKeywordMatch": 10,
    "tagMatch": 5,
    "phaseMatch": 8,
    "filePathMatch": 7,
    "priorityHigh": 3,
    "required": 1000,        # 必須指示
    "criticalFeedback": 500, # 人間の強い指摘
    "copilotEssential": 300  # Copilot判断で必須
  },
  "limits": {
    "maxSections": 10,
    "maxItemsPerSection": 4
  }
}
```

#### 3. `change_context` ツール
開発の文脈・状態を変更し、自動的に指示書を再生成。

**パラメータ**:
```typescript
{
  action: "update" | "read" | "reset",
  state?: {
    phase: "development" | "refactoring" | "testing" | "debugging" | "documentation",
    focus: string[],  // ["API認証", "JWT"]
    priority: "high" | "medium" | "low",
    mode: "normal" | "strict" | "experimental"
  },
  autoRegenerate?: boolean  // デフォルト: true
}
```

**使用例**:
```typescript
change_context({
  action: "update",
  state: {
    phase: "development",
    focus: ["API認証", "JWT", "セキュリティ"],
    priority: "high"
  }
})
// → 自動的に .github/copilot-instructions.md が再生成される
```

#### 4. `generateInstructions()` 関数（内部専用）
- gray-matterでフロントマター付きMarkdownをパース
- スコアリングアルゴリズムで関連指示を抽出
- 必須指示（required: true）は常に含める
- 最大10セクション、各セクション3-4項目

**選択ロジック**:
1. 必須指示（required: true）を抽出
2. 任意指示をスコアリング
3. スコア順に上位を選択（maxSections - 必須数）
4. Markdown生成して `.github/copilot-instructions.md` に書き込み

### テスト結果

**テスト1: 現在の状態取得**
```json
{
  "success": true,
  "context": {
    "phase": "development",
    "focus": [],
    "priority": "medium",
    "mode": "normal"
  }
}
```

**テスト2: 開発フェーズに切り替え（API認証焦点）**
- 焦点: ["API認証", "JWT", "セキュリティ"]
- 生成セクション数: 8
- 自動生成成功: ✓

**テスト3: 生成された指示書確認**
- ファイル: `.github/copilot-instructions.md`
- 行数: 296行
- 内容: 必須2セクション + 関連6セクション

**テスト4: リファクタリングフェーズに切り替え**
- フェーズ変更: development → refactoring
- 生成セクション数: 4（関連指示が変化）

**テスト5: リセット**
- デフォルト状態に戻す: ✓

### 実装ファイル
- `server/src/utils/generateInstructions.ts`: フィルタリングロジック
- `server/src/tools/change_context.ts`: ツール実装
- `server/src/index.ts`: ツール登録
- `.copilot-instructions/**/*.md`: 指示書データベース（10ファイル）
- `.copilot-state/scoring-rules.json`: スコアリングルール
- `.copilot-state/context.json`: 現在の文脈

### 新規パッケージ
- `gray-matter`: フロントマター付きMarkdownパース

### 成果
✅ LLMのアテンション集中（膨大な知識を持ちつつ、今必要な指示だけ提供）  
✅ 文脈依存の動的生成（phase/focusから自動抽出）  
✅ 柔軟なスコアリング（`.copilot-state/scoring-rules.json`で調整可能）  
✅ 必須指示の保証（required/criticalFeedback/copilotEssential）  
✅ 軽量なツール（change_contextのみ、generate_instructionsは内部専用）  
✅ 透過的な動作（状態変更時に自動再生成）

### 設計の確定事項
- **ツール数**: 最小限（change_context のみ追加、generate_instructionsは内部関数）
- **トリガー**: change_context実行時に自動
- **セクション制限**: maxSections=10, maxItemsPerSection=3-4
- **Git統合**: 指示書データベース全体をGit管理推奨
- ロバスト性の向上

---

## シナリオ9: 変更履歴管理とロールバック（Phase 2）

**日付**: 2025年12月1日  
**目的**: 動的指示書生成の履歴を自動記録し、任意の時点にロールバック可能にする

### 課題背景
- 指示書が動的生成されるが、変更履歴が残らない
- 問題が発生しても元の状態に戻せない
- どの変更でどう変わったか追跡できない
- 試行錯誤が困難

### 実装内容

#### 1. 履歴管理ユーティリティ (`server/src/utils/historyManager.ts`)

**データ構造**:
```typescript
interface HistoryEntry {
  timestamp: string;  // ISO 8601形式
  context: DevelopmentContext;
  generatedHash: string;
  sectionsCount: number;
  filePath: string;
}

interface HistoryDetail extends HistoryEntry {
  generatedContent: string;  // 実際に生成された内容
}
```

**ファイル命名規則**: `YYYY-MM-DDTHH-mm-ss-SSSZ-{hash8文字}.json`

**主要機能**:
- `recordHistory()`: 指示書生成時に自動記録
- `listHistory(limit?)`: 履歴一覧取得（新しい順）
- `getHistoryByTimestamp(timestamp | index)`: 特定の履歴取得
- `calculateDiff(from, to)`: 2つの履歴の差分計算
- `cleanupOldHistory(daysToKeep)`: 古い履歴削除（デフォルト30日）

#### 2. `generateInstructions()` に履歴記録を統合

```typescript
// 指示書生成後、自動的に履歴を記録
await recordHistory(context, hash, selectedInstructions.length, markdown);
```

#### 3. `change_context` ツールに新アクション追加

**rollback**: 指定した履歴に復元
```typescript
change_context({
  action: "rollback",
  timestamp: 1  // 0=最新、1=1つ前、または ISO timestamp文字列
})
```

**list-history**: 履歴一覧表示
```typescript
change_context({
  action: "list-history",
  limit: 10  // 最大表示件数
})
```

**show-diff**: 2つの履歴の差分表示
```typescript
change_context({
  action: "show-diff",
  from: 1,  // 比較元（デフォルト: 1）
  to: 0     // 比較先（デフォルト: 0=最新）
})
```

**cleanup-history**: 古い履歴削除
```typescript
change_context({
  action: "cleanup-history",
  daysToKeep: 30  // デフォルト: 30日
})
```

### テスト結果

**テスト1: 初期履歴確認**
```json
{
  "success": true,
  "count": 0,
  "history": []
}
```

**テスト2: 開発フェーズで変更（履歴作成）**
```json
{
  "success": true,
  "previousContext": { "phase": "development", "focus": [], ... },
  "currentContext": { "phase": "development", "focus": ["API認証", "JWT"], ... },
  "regenerated": {
    "success": true,
    "sectionsCount": 8,
    "generatedHash": "33a5833c..."
  }
}
```

**テスト3: リファクタリングフェーズに変更**
```json
{
  "sectionsCount": 4,
  "generatedHash": "671eec08..."
}
```

**テスト4: 履歴一覧表示**
```json
{
  "success": true,
  "count": 2,
  "history": [
    {
      "index": 0,
      "timestamp": "2025-12-01T06:57:21.359Z",
      "phase": "refactoring",
      "focus": ["コードレビュー", "テストカバレッジ"],
      "sectionsCount": 4,
      "hash": "671eec08"
    },
    {
      "index": 1,
      "timestamp": "2025-12-01T06:57:20.348Z",
      "phase": "development",
      "focus": ["API認証", "JWT"],
      "sectionsCount": 8,
      "hash": "33a5833c"
    }
  ]
}
```

**テスト5: 差分表示（index 1 vs index 0）**
```json
{
  "success": true,
  "diff": {
    "contextChanges": {
      "phase": "refactoring",
      "focus": ["コードレビュー", "テストカバレッジ"],
      "priority": "medium"
    },
    "sectionsCountDiff": -4,
    "contentDiff": "Content changed (33a5833c → 671eec08)"
  }
}
```

**テスト6: ロールバック（1つ前に戻す）**
```json
{
  "success": true,
  "message": "Rolled back successfully",
  "restoredContext": {
    "phase": "development",
    "focus": ["API認証", "JWT"],
    "priority": "high"
  },
  "timestamp": "2025-12-01T06:57:20.348Z",
  "sectionsCount": 8
}
```

**テスト7: ロールバック後のコンテキスト確認**
- コンテキストと指示書が正しく復元されている: ✓

**テスト8: 古い履歴のクリーンアップ**
```json
{
  "success": true,
  "message": "Cleaned up 0 old history entries",
  "deletedCount": 0
}
```

### 実装ファイル
- `server/src/utils/historyManager.ts`: 履歴管理ロジック（新規）
- `server/src/utils/generateInstructions.ts`: recordHistory()呼び出し追加
- `server/src/tools/change_context.ts`: 4つのアクション追加（rollback/list-history/show-diff/cleanup-history）
- `server/src/index.ts`: ツールスキーマ更新
- `server/test-history.ts`: テストスクリプト（8シナリオ）

### 履歴ファイルの例
```
.copilot-state/history/
  ├── 2025-12-01T06-57-20-348Z-33a5833c.json  (6.9KB)
  └── 2025-12-01T06-57-21-359Z-671eec08.json  (4.1KB)
```

各ファイルには以下が含まれる:
- タイムスタンプ
- 開発コンテキスト（phase/focus/priority/mode）
- 生成されたMarkdownの完全な内容
- ハッシュ値
- セクション数

### 成果
✅ **自動履歴記録**: generateInstructions()実行時に自動保存  
✅ **簡単なロールバック**: インデックスまたはタイムスタンプ指定で復元  
✅ **履歴一覧**: 直近の変更を時系列で確認  
✅ **差分表示**: 2つの時点の変更内容を比較  
✅ **自動クリーンアップ**: 古い履歴を自動削除（30日デフォルト）  
✅ **完全な復元**: コンテキスト + 指示書の両方を復元  
✅ **軽量な設計**: change_contextに統合、新ツール不要

### 設計の確定事項
- **保存場所**: `.copilot-state/history/`（Gitignore推奨）
- **保持期間**: 30日（設定可能）
- **ファイル形式**: JSON（タイムスタンプ + コンテキスト + 生成内容）
- **命名規則**: ISO timestamp + hash8文字
- **インデックス指定**: 0=最新、1=1つ前、2=2つ前...
- **統合方針**: 新ツール不要、change_contextに4アクション追加

### PBI-002 完了
- [x] 変更時に自動でスナップショット作成
- [x] ロールバック機能の実装
- [x] 履歴一覧表示機能
- [x] 差分表示機能
- [x] 古い履歴の自動クリーンアップ


---

## シナリオ10: feedbackツール（Phase 3）

**日付**: 2025年12月1日  
**目的**: 重要な指示を明示的に強調するfeedbackツールの実装

### 課題背景
- 動的指示書生成では、スコアリングアルゴリズムで関連指示を抽出
- しかし、「この指示は特に重要」という人間の判断やLLMの観察を反映する仕組みがない
- criticalFeedback（500点）、copilotEssential（300点）フラグは既に存在するが、設定手段がない

### 実装内容

#### 1. feedbackツール (`server/src/tools/feedback.ts`)

**3つのアクション**:
- `add`: 指示ファイルのフロントマターにフラグを追加
- `remove`: フラグを削除
- `list`: フラグ付き指示を一覧表示（フィルタ可能）

**2つのフラグタイプ**:
- `criticalFeedback`: 人間開発者の明示的な強い指摘（+500点）
- `copilotEssential`: LLMが自律的に「これは重要」と判断（+300点）

**パラメータ**:
```typescript
{
  action: "add" | "remove" | "list",
  // add/remove用
  filePath?: string,  // 例: "conventions/typescript.md"
  flagType?: "criticalFeedback" | "copilotEssential",
  reason?: string,     // 理由（推奨）
  // list用
  filter?: "all" | "criticalFeedback" | "copilotEssential"
}
```

#### 2. フロントマター更新

```yaml
---
category: conventions
tags: [typescript, coding-style]
priority: high
required: true
criticalFeedback: true  # feedbackツールで追加
criticalFeedbackReason: "型安全性の重要性を強調するため"
---
```

#### 3. スコアリングアルゴリズムとの連携

既存のスコアリングルール（`.copilot-state/scoring-rules.json`）:
```json
{
  "rules": {
    "criticalFeedback": 500,
    "copilotEssential": 300,
    ...
  }
}
```

フラグが設定された指示は、動的生成時に自動的に高スコアを獲得し、優先的に抽出される。

### テスト結果

**テスト1: 初期状態確認**
```json
{
  "success": true,
  "count": 0,
  "feedbacks": []
}
```

**テスト2: criticalFeedbackフラグ追加**
```json
{
  "success": true,
  "action": "add",
  "filePath": "conventions/typescript.md",
  "flagType": "criticalFeedback",
  "reason": "型安全性の重要性を強調するため"
}
```

**テスト3: copilotEssentialフラグ追加**
```json
{
  "success": true,
  "action": "add",
  "filePath": "patterns/error-handling.md",
  "flagType": "copilotEssential",
  "reason": "エラー処理は常に重要と判断"
}
```

**テスト4: フラグ付き指示を一覧表示**
```json
{
  "success": true,
  "count": 2,
  "feedbacks": [
    {
      "filePath": "conventions/typescript.md",
      "category": "conventions",
      "flags": {
        "criticalFeedback": true,
        "copilotEssential": false
      },
      "reason": "型安全性の重要性を強調するため"
    },
    {
      "filePath": "patterns/error-handling.md",
      "category": "patterns",
      "flags": {
        "criticalFeedback": false,
        "copilotEssential": true
      },
      "reason": "エラー処理は常に重要と判断"
    }
  ]
}
```

**テスト5: criticalFeedbackフィルタ**
- 1件抽出（conventions/typescript.md）✓

**テスト6: copilotEssentialフィルタ**
- 1件抽出（patterns/error-handling.md）✓

**テスト7-10: フラグ削除とクリーンアップ**
- すべて正常に削除 ✓

### 実装ファイル
- `server/src/tools/feedback.ts`: feedbackツール実装（新規、170行）
- `server/src/index.ts`: ツール登録
- `server/test-feedback.ts`: テストスクリプト（10シナリオ）

### 使用例

```typescript
// 人間開発者: 重要な指示にcriticalFeedbackフラグ
feedback({
  action: "add",
  filePath: "conventions/typescript.md",
  flagType: "criticalFeedback",
  reason: "型安全性の徹底は最優先事項"
})

// LLM: 自身で重要と判断した指示にcopilotEssentialフラグ
feedback({
  action: "add",
  filePath: "patterns/error-handling.md",
  flagType: "copilotEssential",
  reason: "エラー処理パターンは常に考慮すべき"
})

// フラグ付き指示を一覧表示
feedback({ action: "list" })

// criticalFeedbackのみフィルタ
feedback({ action: "list", filter: "criticalFeedback" })
```

### 成果
✅ **シンプルな実装**: 3アクション（add/remove/list）のみ  
✅ **既存機能との連携**: スコアリングアルゴリズムと自動連携  
✅ **柔軟な判断**: 人間の指摘 + LLMの自律判断の両方をサポート  
✅ **フロントマター更新**: gray-matterで安全に更新  
✅ **フィルタリング**: criticalFeedback/copilotEssential/allで絞り込み  
✅ **理由記録**: なぜ重要かを明確化  

### 設計の確定事項
- **保存場所**: `.copilot-instructions/`のフロントマター
- **フラグ**: criticalFeedback（人間）/ copilotEssential（LLM）
- **スコアリング**: +500点 / +300点
- **理由記録**: `criticalFeedbackReason`/`copilotEssentialReason`
- **動的生成**: change_context実行時に自動的に高スコアで抽出

### PBI-004 完了
- [x] feedbackツール実装（add/remove/list）
- [x] criticalFeedback/copilotEssentialフラグ対応
- [x] フロントマター自動更新
- [x] スコアリングアルゴリズムとの連携確認
- [x] テスト（10シナリオすべて成功）


---

## Scenario 11: 優先フラグのソフト・ハードリミット（Phase 3 - 改善）

### 背景

PBI-004でfeedbackツールを実装後、ユーザーから重要な指摘:
- 「優先ばかり増えると、優先以外のコンテキストに必要な情報が圧迫される」
- 無制限に優先フラグを付けると、動的生成の目的「今の流れに必要な指示だけ」が損なわれる

### 設計方針

**ソフトリミット（警告）とハードリミット（エラー）の2段階制限**

```json
{
  "limits": {
    "priorityFlags": {
      "criticalFeedback": {
        "softLimit": 2,  // 警告表示
        "hardLimit": 3   // 追加不可
      },
      "copilotEssential": {
        "softLimit": 3,
        "hardLimit": 4
      }
    }
  }
}
```

- **ソフトリミット**: 次に追加するとハードリミットに達する数
- **ハードリミット**: これ以上追加できない上限

### 実装内容

#### 1. scoring-rules.jsonの拡張

`limits.priorityFlags`セクションを追加。

#### 2. feedback.tsの機能強化

**add時の挙動:**
```typescript
// 現在のフラグ数をカウント
const currentCount = (await listFeedbacks(flagType)).length;

// ハードリミットチェック
if (currentCount >= hardLimit) {
  return {
    success: false,
    error: "HARD_LIMIT_REACHED",
    message: "❌ ハードリミット到達",
    existingFlags: [...],
    suggestion: "既存のフラグを削除してから追加してください"
  };
}

// ソフトリミット警告
if (currentCount >= softLimit) {
  warning = "⚠️ ソフトリミット到達: 次回追加時にハードリミットに達します";
  // 既存フラグ一覧と推奨アクションを表示
}
```

**list時の統計情報:**
```json
{
  "summary": {
    "criticalFeedback": {
      "count": 2,
      "softLimit": 2,
      "hardLimit": 3,
      "status": "warning"  // ok | warning | error
    },
    "warnings": ["criticalFeedback: 2/3 ⚠️ ソフトリミット到達"]
  }
}
```

### テスト結果

**Test 11-14**: リミット機能のテスト

```
Test 11: 2個追加でソフトリミット到達
→ status: "warning", warnings配列に警告メッセージ

Test 12: 3個目追加（ソフトリミット超過）
→ success: true, warningフィールドに詳細な警告
  - 既存フラグ一覧
  - 推奨アクション（見直し、削除、統合）

Test 13: 4個目追加（ハードリミット超過）
→ success: false, error: "HARD_LIMIT_REACHED"
  - 既存フラグ一覧と理由
  - 削除を促すメッセージ

Test 14: クリーンアップ成功
```

### 効果

1. **優先度のインフレ防止**
   - ハードリミットで物理的に制限
   - ソフトリミットで事前警告

2. **ユーザビリティ向上**
   - 警告時に既存フラグ一覧を表示
   - 具体的な推奨アクションを提示
   - エラー時も理由と解決策を明示

3. **設計哲学の保持**
   - "今の流れに必要な指示だけ"を維持
   - コンテキスト依存の動的生成を圧迫しない
   - 優先フラグは厳選されたものだけに

### 設計判断

- **criticalFeedback**: ハード3個まで（人間の強い指摘は少数精鋭）
- **copilotEssential**: ハード4個まで（LLMの判断は少し緩め）
- **ソフトはハードの-1**: 次に失敗することを事前警告
- **段階的な情報提供**: ok → warning（一覧） → error（一覧+解決策）

### 今後の拡張可能性

- マージ提案機能（suggest-mergeアクション）
- 優先度の自動降格（一定期間使われないフラグの削除提案）
- カテゴリ別のリミット設定


---

## Scenario 12: 複数Copilotセッション間の排他制御（Phase 2完了）

### 背景

複数のCopilotセッション（または複数の人間開発者がそれぞれCopilotを使用）が同時に指示書を更新しようとすると、以下の問題が発生する可能性:
- データ競合（race condition）
- 一方の変更が失われる（lost update）
- 不整合な状態

PBI-003として、排他制御の実装が求められていた。

### 設計方針

**ロックファイルベースの排他制御**

- ファイル: `.copilot-state/.lock`
- セッションID: `{pid}-{timestamp}`
- タイムアウト: 5秒
- 古いロック自動削除: タイムアウトの2倍（10秒）以上経過したロックは無効化

**設計判断**:
1. **ファイルベース**: データベース不要、シンプル
2. **短いタイムアウト**: 更新処理は通常1秒未満で完了
3. **古いロック削除**: デッドロック防止（プロセスクラッシュ時）
4. **withLock パターン**: try-finally で確実に解放

### 実装内容

#### 1. lockManager.ts の作成

**主要関数**:
```typescript
// ロック取得（タイムアウト付き）
acquireLock(timeoutMs = 5000): Promise<string | null>

// ロック解放
releaseLock(sessionId: string): Promise<void>

// ロック付き処理実行（自動解放）
withLock<T>(fn: () => Promise<T>, timeoutMs = 5000): Promise<T>

// ロック状態取得（デバッグ用）
getLockStatus(): Promise<LockInfo | null>
```

**ロック取得のアルゴリズム**:
```typescript
while (経過時間 < タイムアウト) {
  if (ロックファイルなし) {
    ロックファイル作成（wx flag）
    return sessionId
  }
  
  if (ロックが古い（>10秒）) {
    警告ログ出力
    ロックファイル削除
    continue  // 再試行
  }
  
  100ms 待機
}

return null  // タイムアウト
```

#### 2. instructions_structure.ts への統合

**update アクション**:
```typescript
case 'update': {
  try {
    // withLock で排他制御
    const result = await withLock(async () => {
      return await updateSection(args.heading, args.content);
    });
    
    // 成功メッセージ
    return `セクション「${args.heading}」を更新しました。`;
  } catch (error) {
    // ロック取得失敗の場合は分かりやすいメッセージ
    if (message.includes('Failed to acquire lock')) {
      return `❌ ロック取得タイムアウト: 他のセッションが指示書を更新中です。しばらく待ってから再試行してください。`;
    }
    
    return `エラー: ${message}`;
  }
}
```

**resolve-conflict アクション**:
```typescript
case 'resolve-conflict': {
  try {
    // 競合解決も排他制御
    const result = await withLock(async () => {
      return await resolveConflict(...);
    });
    // ...
  }
}
```

### テスト結果

**test-concurrency.ts**:

```
Test 1: ロック状態の確認
→ ロックされていません ✓

Test 2: 単一セッションでの更新
→ 正常に更新完了 ✓

Test 3: ロック取得・解放の基本動作
→ ロック取得成功: 263708-1764574728047
→ 別セッションがロック取得を試みる（タイムアウト: 500ms）
→ ✓ 期待通り: ロック取得タイムアウト（505ms）
→ ロック解放後に新規取得成功 ✓

Test 4: 古いロックの自動削除（デッドロック防止）
→ 11秒前のロックをシミュレート
→ Stale lock detected (age: 11001ms). Removing...
→ ✓ 期待通り: 古いロックを削除して新規取得に成功

Test 5: 順次更新テスト（ロック解放確認）
→ 3回連続で更新を試みる
→ すべて成功 ✓（ロックが正しく解放されている）

Test 6: 最終ロック状態の確認
→ ロックされていません ✓（すべて解放済み）
```

### 効果

1. **データ競合の防止**
   - 複数セッションの同時更新を排他制御
   - withLock パターンで確実に解放

2. **デッドロック防止**
   - 古いロック（10秒以上）は自動削除
   - プロセスクラッシュ時も復旧可能

3. **ユーザーフレンドリー**
   - タイムアウト時に分かりやすいメッセージ
   - 「しばらく待ってから再試行」を提案

4. **シンプルさ**
   - 外部依存なし（ファイルシステムのみ）
   - データベース不要
   - 設定不要

### 設計判断

**ロックのタイムアウト: 5秒**
- 通常の更新処理: < 1秒
- 余裕を持って5秒
- 体感的に許容範囲

**古いロックの判定: 10秒**
- タイムアウトの2倍
- プロセスクラッシュを想定
- 誤削除を防止

**リトライ間隔: 100ms**
- 100ms × 50回 = 5秒（タイムアウト）
- CPU負荷を抑える
- 応答性は十分

**ファイルベース vs データベース**
- ✓ ファイルベース: シンプル、依存なし、設定不要
- ✗ データベース: オーバースペック、複雑

### Node.jsシングルスレッドの考慮

**注意点**:
Node.jsはシングルスレッドのため、同一プロセス内では Promise.all でも実質的に順次実行される。

**真の並行性テスト**:
- 別プロセスを起動する必要がある
- `child_process.fork()` で複数プロセス
- 本テストでは、手動ロック取得でメカニズムを検証

**実運用での並行性**:
- 複数のVS Codeウィンドウ → 別プロセス
- 複数の開発者 → 別マシン
- どちらも同じロックファイルを参照 → 排他制御が機能

### 今後の拡張可能性

1. **ロックの可視化**
   - どのセッションがロックを保持しているか表示
   - ロック待機中のセッション数

2. **優先度付きロック**
   - 人間のセッションを優先
   - バックグラウンドタスクは低優先度

3. **分散ロック**
   - 複数マシン間での排他制御
   - Redis等の外部KVSを使用

### PBI-003完了チェックリスト

- [x] ロックファイル（`.copilot-state/.lock`）による排他制御
- [x] タイムアウト処理（5秒）
- [x] デッドロック検知（古いロック自動削除）
- [x] withLock パターンでの自動解放
- [x] instructions_structure への統合（update/resolve-conflict）
- [x] テスト6シナリオすべて成功
- [x] ユーザーフレンドリーなエラーメッセージ
- [x] ドキュメント更新

---

## Scenario 13: instructions_structure CRUD完成（delete/insert実装） - PBI-006

**日時**: 2025-12-01  
**対応PBI**: PBI-006  
**Phase**: Phase 3

### 背景

Phase 2完了時点で、`instructions_structure`ツールは**Read**と**Update**のみをサポートしていました。
指示書の完全な管理には**Create（挿入）**と**Delete（削除）**が必要です。

**実装前の状況**:
- ✅ read: セクション構造の取得
- ✅ update: 既存セクションの更新
- ❌ delete: セクションの削除（未実装）
- ❌ insert: 新規セクションの挿入（未実装）
- ✅ detect-conflicts: 競合検出
- ✅ resolve-conflict: 競合解決

### 実装内容

#### 1. markdownAst.ts への2つの新関数追加

**deleteSection関数** (~35行):
```typescript
export async function deleteSection(
  heading: string
): Promise<{ success: boolean; error?: string }> {
  const content = await readInstructionsFile();
  
  // セクションの見出しを検索
  const headingPattern = new RegExp(`^## ${heading}$`, 'm');
  const headingMatch = content.match(headingPattern);
  
  if (!headingMatch) {
    return { success: false, error: `セクション「${heading}」が見つかりません` };
  }

  // セクション範囲を特定（見出しから次の見出しまで、または末尾まで）
  const sectionStart = headingMatch.index;
  const remainingContent = content.substring(sectionStart);
  const nextHeadingMatch = remainingContent.match(/\n## /);
  const sectionEnd = nextHeadingMatch 
    ? sectionStart + nextHeadingMatch.index 
    : content.length;

  // セクションを削除
  const newContent = 
    content.substring(0, sectionStart) +
    content.substring(sectionEnd);

  await writeInstructionsFile(newContent);
  return { success: true };
}
```

**insertSection関数** (~105行):
```typescript
export async function insertSection(
  heading: string,
  content: string,
  position: 'before' | 'after' | 'first' | 'last',
  anchor?: string
): Promise<{ success: boolean; error?: string }> {
  const currentContent = await readInstructionsFile();

  // 重複チェック
  const existingPattern = new RegExp(`^## ${heading}$`, 'm');
  if (existingPattern.test(currentContent)) {
    return { success: false, error: `セクション「${heading}」は既に存在します` };
  }

  const newSection = `## ${heading}\n\n${content.trim()}\n\n`;
  let insertIndex: number;

  switch (position) {
    case 'first': {
      // タイトル行（# Copilot Instructions）の後に挿入
      const titleMatch = currentContent.match(/^#[^#].*$/m);
      insertIndex = titleMatch 
        ? titleMatch.index + titleMatch[0].length + 1
        : 0;
      break;
    }

    case 'last': {
      // ファイルの最後に挿入
      insertIndex = currentContent.length;
      break;
    }

    case 'before':
    case 'after': {
      if (!anchor) {
        return { success: false, error: `position='${position}'の場合はanchorが必須です` };
      }

      // アンカーセクションを検索
      const anchorPattern = new RegExp(`^## ${anchor}$`, 'm');
      const anchorMatch = currentContent.match(anchorPattern);
      
      if (!anchorMatch) {
        return { success: false, error: `アンカーセクション「${anchor}」が見つかりません` };
      }

      if (position === 'before') {
        insertIndex = anchorMatch.index;
      } else {
        // afterの場合、アンカーセクションの終わりを探す
        const sectionStart = anchorMatch.index;
        const remainingContent = currentContent.substring(sectionStart);
        const nextHeadingMatch = remainingContent.match(/\n## /);
        
        insertIndex = nextHeadingMatch 
          ? sectionStart + nextHeadingMatch.index + 1
          : currentContent.length;
      }
      break;
    }
  }

  const newContent = 
    currentContent.substring(0, insertIndex) +
    newSection +
    currentContent.substring(insertIndex);

  await writeInstructionsFile(newContent);
  return { success: true };
}
```

**設計判断**:
- **テキストベース処理**: AST解析ではなく正規表現でシンプルに実装
- **セクション境界**: `## `で始まる行を境界として認識
- **4つの挿入位置**: 柔軟性を確保
  - `first`: ファイル先頭（高優先度セクション向け）
  - `last`: ファイル末尾（新規追加の標準）
  - `before`: アンカーの前（論理的グループ化）
  - `after`: アンカーの後（関連コンテンツ配置）

#### 2. instructions_structure.ts への統合

**新しいアクション定義**:
```typescript
interface DeleteStructureArgs {
  action: 'delete';
  heading: string;
}

interface InsertStructureArgs {
  action: 'insert';
  heading: string;
  content: string;
  position: 'before' | 'after' | 'first' | 'last';
  anchor?: string;
}
```

**deleteアクション実装**:
```typescript
case 'delete': {
  try {
    const result = await withLock(async () => {
      return await deleteSection(args.heading);
    });

    if (!result.success) {
      return `エラー: ${result.error}`;
    }

    return `✓ セクション「${args.heading}」を削除しました。`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Timeout')) {
      return `❌ ロック取得タイムアウト: 他のセッションが指示書を更新中です。しばらく待ってから再試行してください。`;
    }
    return `エラー: ${message}`;
  }
}
```

**insertアクション実装**:
```typescript
case 'insert': {
  try {
    const result = await withLock(async () => {
      return await insertSection(
        args.heading,
        args.content,
        args.position,
        args.anchor
      );
    });

    if (!result.success) {
      return `エラー: ${result.error}`;
    }

    // 挿入位置のメッセージ構築
    let positionMsg = '';
    switch (args.position) {
      case 'first': positionMsg = '先頭に'; break;
      case 'last': positionMsg = '最後に'; break;
      case 'before': positionMsg = `「${args.anchor}」の前に`; break;
      case 'after': positionMsg = `「${args.anchor}」の後に`; break;
    }

    return `✓ セクション「${args.heading}」を${positionMsg}挿入しました。`;
  } catch (error) {
    // エラー処理（deleteと同様）
  }
}
```

**排他制御の統合**:
- `withLock`パターンで自動的にロック取得・解放
- タイムアウト時は分かりやすいメッセージ
- 他のアクション（update/resolve-conflict）と一貫性

#### 3. MCP スキーマ更新

**index.ts での登録**:
```typescript
{
  name: 'instructions_structure',
  description: '指示書Markdown ASTの完全なCRUD操作と競合管理。',
  inputSchema: {
    properties: {
      action: {
        enum: ['read', 'update', 'delete', 'insert', 'detect-conflicts', 'resolve-conflict'],
        description: '... delete(セクション削除) / insert(セクション挿入) ...'
      },
      heading: {
        description: 'セクション見出し（update/delete/insert/resolve-conflictの場合必須）'
      },
      content: {
        description: 'セクション内容（update/insertの場合必須）'
      },
      position: {
        enum: ['before', 'after', 'first', 'last'],
        description: '挿入位置（insertの場合必須）: before(アンカーの前) / after(アンカーの後) / first(先頭) / last(最後)'
      },
      anchor: {
        description: '基準となるセクションの見出し（position=before/afterの場合必須）'
      },
      // ... 既存のプロパティ ...
    }
  }
}
```

### テスト結果

**test-delete-insert.ts** - 10シナリオ:

```
🧪 instructions_structure delete/insert 統合テスト

--- Scenario 3: 先頭への挿入 ---
✅ 先頭挿入

--- Scenario 4: 末尾への挿入 ---
✅ 末尾挿入

--- Scenario 5: アンカーの前に挿入 ---
✅ アンカーの前に挿入

--- Scenario 6: アンカーの後に挿入 ---
✅ アンカーの後に挿入

--- Scenario 1: 既存セクションの削除 ---
✅ 既存セクション削除

--- Scenario 2: 存在しないセクションの削除 ---
✅ 存在しないセクション削除（エラーメッセージ検証）

--- Scenario 7: 存在しないアンカーへの挿入 ---
✅ 存在しないアンカー（エラーメッセージ検証）

--- Scenario 8: 重複セクションの挿入 ---
✅ 重複挿入の防止（エラーメッセージ検証）

--- Scenario 9: 連続操作（挿入→削除） ---
✅ 挿入フェーズ
✅ 削除フェーズ

--- Scenario 10: 挿入内容の検証 ---
✅ 複数行コンテンツ
   内容が正しく挿入されました

==================================================
✅ 全テスト完了
```

**テストの特徴**:
- ファイルのバックアップ・復元機能
- 正常系と異常系の両方をカバー
- エラーメッセージの検証
- 複数行コンテンツの正確性検証

### 効果

#### 1. CRUD操作の完成

| 操作 | アクション | 説明 | 状態 |
|------|-----------|------|------|
| **Create** | insert | 新規セクション挿入 | ✅ 実装済 |
| **Read** | read | 構造取得 | ✅ 既存 |
| **Update** | update | セクション更新 | ✅ 既存 |
| **Delete** | delete | セクション削除 | ✅ 実装済 |

#### 2. 柔軟な挿入位置

```typescript
// 使用例
instructions_structure({
  action: 'insert',
  heading: '新セクション',
  content: '内容...',
  position: 'first'  // or 'last', 'before', 'after'
  anchor: '既存セクション'  // before/afterの場合
})
```

#### 3. 安全性の確保

- **重複防止**: 同じ見出しのセクションは作成不可
- **存在確認**: 削除前に存在チェック
- **アンカー検証**: before/after時にアンカーの存在確認
- **排他制御**: withLockによる並行処理の安全性

#### 4. Copilotの自律性向上

**できるようになったこと**:
- 不要なセクションの削除（廃止された規約など）
- 新しいセクションの追加（新技術の導入時）
- セクションの論理的配置（関連セクションをグループ化）
- 動的な指示書構成の変更

### 今後の拡張可能性

1. **セクションの移動**
   - deleteとinsertの組み合わせで実現可能
   - 専用の`move`アクションも検討

2. **セクションのコピー**
   - 既存セクションを読み取り、別の場所に挿入
   - テンプレート化に有用

3. **バルク操作**
   - 複数セクションの一括挿入・削除
   - トランザクション的な処理

4. **セクション順序の最適化**
   - 重要度や使用頻度に基づく自動並び替え
   - アクセスパターン分析との連携

### PBI-006完了チェックリスト

- [x] `deleteSection`関数実装（markdownAst.ts）
- [x] `insertSection`関数実装（markdownAst.ts）
- [x] 4つの挿入位置サポート（first/last/before/after）
- [x] 重複チェック機能
- [x] アンカー存在確認
- [x] instructions_structure.tsへの統合
  - [x] DeleteStructureArgs/InsertStructureArgs定義
  - [x] deleteアクション実装
  - [x] insertアクション実装
- [x] withLockによる排他制御統合
- [x] MCPスキーマ更新（index.ts）
  - [x] action enumに'delete', 'insert'追加
  - [x] position/anchorプロパティ追加
- [x] テストスクリプト作成（test-delete-insert.ts）
- [x] 10シナリオすべて成功
- [x] ドキュメント更新（Scenario 13）

### 成果まとめ

**実装規模**:
- 追加コード: ~200行（markdownAst.ts ~140行、instructions_structure.ts ~60行）
- テストコード: ~150行
- 開発時間: 約2時間

**品質指標**:
- テスト成功率: 10/10 (100%)
- エラーハンドリング: 5パターン
- 排他制御: 完全統合

**技術的価値**:
- ✅ CRUD完成により指示書管理の完全な自動化
- ✅ 4つの挿入位置で柔軟な構成管理
- ✅ 排他制御統合で並行処理の安全性確保
- ✅ テキストベース処理でシンプルかつ効率的

**Phase 3の第一歩**として、指示書管理の基盤が完成しました！

---

## Phase 2 完了 🎉

PBI-003の完了により、**Phase 2のすべての項目が完了**しました。

**Phase 2完了項目**:
1. ✅ PBI-001: 外部変更検知と競合解決（Step 1, 1.5, 2）
2. ✅ PBI-002: 変更履歴管理とロールバック
3. ✅ 動的指示書生成エンジン
4. ✅ PBI-004: feedbackツール + ソフト・ハードリミット
5. ✅ **PBI-003: 複数Copilotセッション間の排他制御**

**Phase 2の目標達成**:
- ✅ 安定性: 外部変更検知、競合解決、排他制御
- ✅ 並行制御: ロックファイルによる排他制御
- ✅ 履歴管理: 自動スナップショット、ロールバック

次は **Phase 3** へ！

---

## Phase 3 進行中 🚀

**Phase 3完了項目**:
1. ✅ **PBI-006: instructions_structure CRUD完成（delete/insert実装）**

**残りのPhase 3項目**:
- PBI-005: サマリー表示のカスタマイズ
- feedback拡張: suggest-merge機能
- S8: 指示最適化ルール
- S6: adaptive_instructions

---

## Scenario 14: 既存プロジェクトへの安全な導入とマイグレーション

**日時**: 2025-12-01（計画）  
**Phase**: Phase 3  
**優先度**: 🔴 High（実運用で必須）

### 背景

**実際のプロジェクト導入で直面する課題**:
- 既存の `copilot-instructions.md` が存在する可能性
- 既存の指示書は様々な形式・品質状態
- **既存のエッセンスを壊してはいけない**
- **ユーザーの許可なしに勝手に変更してはいけない**
- 承認が得られない場合は機能制限が必要

### 導入パターン分類

#### パターン1: クリーンな導入 ✅（現在サポート済み）
**状態**:
- `.github/copilot-instructions.md` が存在しない
- 新規プロジェクトまたは指示書未使用

**動作**:
- MCPサーバが初期構造を作成
- ユーザーは自由に編集・管理可能
- **問題なし** ← 現在の実装で対応済み

---

#### パターン2: 構造化済み指示書 ✅（互換性あり）
**状態**:
```markdown
# Copilot Instructions

## TypeScript規約

- 型を明示
- ESLint準拠

## テストパターン

- Jest使用
- カバレッジ80%以上
```

**特徴**:
- 既に `## セクション名` 形式で整理されている
- このMCPサーバの形式と互換性あり

**動作**:
1. MCPサーバが既存構造を認識
2. そのまま読み取り・更新可能
3. **マイグレーション不要**
4. ユーザーに「既存の指示書を検出しました。そのまま利用できます。」と通知

**実装要件**:
- ✅ 既に実装済み（`instructions_structure: read`で対応）
- ユーザーへの通知機能追加（guidance拡張）

---

#### パターン3: 非構造化指示書 ⚠️（マイグレーション必要）
**状態**:
```markdown
TypeScriptは型を明示してください。
また、ESLintに従ってください。

テストはJestを使います。
カバレッジは80%以上を目指してください。

変数名はcamelCaseで。
```

**特徴**:
- セクション分けがない（フリーフォーマット）
- 有用な情報は含まれているが整理が必要
- **構造化すれば利用可能**

**リスク**:
- 勝手に構造化すると、ユーザーの意図を損なう可能性
- セクション分けの基準がユーザーと異なるかも

**必要な手順**:
1. **検出**: 非構造化形式であることを認識
2. **分析**: 内容を解析し、自然なセクション分けを提案
3. **提案**: 「このような構造に整理できます」とプレビュー表示
4. **承認**: ユーザーの明示的な承認を得る
5. **バックアップ**: 元のファイルを `.backup` に保存
6. **マイグレーション**: 承認された構造で書き換え
7. **検証**: ユーザーに確認を促す

**実装が必要な機能**:
- 📋 `analyze_instructions`: 既存指示書の分析
- 📋 `propose_migration`: マイグレーション計画の提案
- 📋 `execute_migration`: 安全なマイグレーション実行

---

#### パターン4: めちゃくちゃな状態 🔴（クリーンアップ必要）
**状態**:
```markdown
## TypeScript規約

型は明示してください。anyは禁止。

## TypeScript Rules

anyを使ってもOK（レガシーコードのみ）

変数名はsnake_case
いや、camelCaseで

## Tests

Jest使用

## テスト

Vitestに移行中
```

**特徴**:
- 矛盾する指示が混在（`any禁止` vs `anyOK`）
- 重複セクション（`Tests` vs `テスト`）
- 古い情報と新しい情報が混在
- **自動判断不可能**

**リスク**:
- **最も危険**: 自動処理すると確実に問題が起きる
- ユーザーの最新の意図がどれか不明

**必要な手順**:
1. **検出**: 矛盾・重複を検知
2. **問題報告**: 具体的な問題点をリスト化
   - 「矛盾: any禁止 vs anyOK」
   - 「重複: Tests, テスト」
   - 「不明: どちらが最新？」
3. **判断不可**: 「自動処理できません」と明示
4. **手動修正依頼**: ユーザーに手動での整理を促す
5. **機能制限モード**: 承認が得られるまで読み取り専用

**実装が必要な機能**:
- 📋 `detect_conflicts_in_existing`: 既存指示書の問題検出
- 📋 `restricted_mode`: 機能制限モード（read-onlyなど）

---

### 実装計画: 段階的アプローチ

#### Phase A: 検出と分析（優先度: 🔴 High）

**新しいツール: `onboarding`**

```typescript
{
  name: 'onboarding',
  description: '既存プロジェクトへのMCPサーバ導入を支援。既存指示書の分析、マイグレーション提案、安全な適用。',
  actions: [
    'analyze',        // 既存指示書の分析
    'propose',        // マイグレーション計画の提案
    'approve',        // ユーザー承認の記録
    'migrate',        // マイグレーション実行
    'rollback',       // マイグレーション取り消し
    'status'          // オンボーディング状態確認
  ]
}
```

**analyze アクション**:
```typescript
interface AnalyzeResult {
  exists: boolean;           // 指示書の存在
  pattern: 'clean' | 'structured' | 'unstructured' | 'messy';
  
  structured?: {             // 構造化済みの場合
    sections: Array<{ heading: string; lineCount: number }>;
    compatible: boolean;     // このMCPと互換性あり
  };
  
  unstructured?: {           // 非構造化の場合
    contentLength: number;
    suggestedSections: Array<{
      heading: string;
      content: string;
      confidence: number;    // 提案の信頼度 0-1
    }>;
  };
  
  problems?: Array<{         // 問題がある場合
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  
  recommendation: string;    // 推奨アクション
}
```

**使用例**:
```typescript
// ユーザーがMCPサーバを初めて使う時
const result = await onboarding({ action: 'analyze' });

// パターン2（構造化済み）の場合
// → "既存の指示書を検出しました。そのまま利用できます。"

// パターン3（非構造化）の場合
// → "構造化することで管理しやすくなります。提案を確認しますか？"

// パターン4（めちゃくちゃ）の場合
// → "矛盾が検出されました。手動での修正をお勧めします。"
```

---

#### Phase B: マイグレーション提案（優先度: 🟡 Medium）

**propose アクション**:
```typescript
interface MigrationProposal {
  originalBackupPath: string;  // バックアップ先
  proposedStructure: string;   // 提案する新構造（プレビュー）
  
  changes: Array<{
    type: 'add_section' | 'merge_content' | 'reorder';
    description: string;
    before?: string;           // 変更前
    after?: string;            // 変更後
  }>;
  
  risks: Array<{               // リスク評価
    level: 'low' | 'medium' | 'high';
    description: string;
  }>;
  
  requiresApproval: boolean;   // 承認必須か
}
```

**ユーザーインタラクション**:
```
Copilot: 「既存の指示書を分析しました。以下のような構造に整理できます：

【提案する構造】
## TypeScript規約
- 型を明示
- ESLint準拠

## テストパターン
- Jest使用
- カバレッジ80%以上

## 命名規則
- 変数: camelCase

【変更内容】
1. フリーフォーマットをセクション分け
2. 関連する内容をグループ化
3. 重複する内容を統合

【リスク】
- 低: 既存の情報は保持されます
- 中: セクション分けの基準が意図と異なる可能性

元のファイルは .github/copilot-instructions.md.backup に保存されます。
この変更を適用しますか？ (yes/no)」

User: "yes"

Copilot: 「承認を記録しました。実行しますか？」
```

---

#### Phase C: 安全な実行（優先度: 🟡 Medium）

**migrate アクション**:
```typescript
interface MigrationExecution {
  approved: boolean;            // 承認済みか確認
  backupCreated: boolean;       // バックアップ作成済み
  migrationApplied: boolean;    // マイグレーション適用済み
  verified: boolean;            // ユーザー検証済み
  
  rollbackAvailable: boolean;   // ロールバック可能か
}
```

**安全性の確保**:
1. **承認確認**: approve済みでないと実行不可
2. **バックアップ作成**: `.backup` + タイムスタンプ
3. **アトミック操作**: 失敗時は即座にロールバック
4. **検証プロンプト**: 適用後にユーザーへの確認
5. **ロールバック機能**: 24時間以内なら簡単に戻せる

---

#### Phase D: 機能制限モード（優先度: 🔴 High）

**承認が得られない場合の動作**:

```typescript
// .copilot-state/onboarding-status.json
{
  "status": "pending_approval",  // or "approved", "rejected"
  "analyzedAt": "2025-12-01T10:00:00Z",
  "pattern": "unstructured",
  "userDecision": null,          // "approve" | "reject" | "later"
  "restrictedMode": true
}
```

**制限モードでの動作**:
- ✅ `guidance`: 使用可能（情報提供のみ）
- ✅ `instructions_structure: read`: 使用可能（読み取りのみ）
- ❌ `instructions_structure: update/delete/insert`: **使用不可**
- ❌ `change_context`: **使用不可**（指示書変更を伴うため）
- ✅ `project_context`: 使用可能
- ✅ `feedback`: 使用可能

**制限モード時のメッセージ**:
```
「既存の指示書が検出されましたが、まだマイグレーションが承認されていません。
現在は読み取り専用モードで動作しています。

マイグレーション提案を確認するには:
  onboarding({ action: 'propose' })

後で決めたい場合は、このまま読み取り専用で使用できます。」
```

---

### ユーザーエクスペリエンスのフロー

#### シナリオA: 非構造化指示書の導入

```
【初回実行時】
User: (MCPサーバを初めて使用)

Copilot: 「既存の指示書を検出しました。分析を実行します...」
         (自動的に analyze を実行)
         
         「非構造化の指示書が見つかりました。
         構造化することで以下のメリットがあります:
         - セクション単位での更新・管理
         - 競合検出と自動解決
         - 履歴管理とロールバック
         
         提案を確認しますか？」

User: "はい"

Copilot: (propose を実行)
         「【提案する構造】
         ... (プレビュー表示) ...
         
         この変更を適用しますか？
         元のファイルはバックアップされます。」

User: "適用してください"

Copilot: (migrate を実行)
         「✓ バックアップ作成: .github/copilot-instructions.md.backup
         ✓ マイグレーション適用完了
         
         内容を確認してください。問題があれば:
           onboarding({ action: 'rollback' })
         で元に戻せます（24時間以内）。」

User: (ファイルを確認)
      "問題ありません"

Copilot: 「承認ありがとうございます。
         通常モードで動作します。」
```

#### シナリオB: めちゃくちゃな状態の指示書

```
User: (MCPサーバを初めて使用)

Copilot: 「既存の指示書を分析中...」
         
         「⚠️ 問題が検出されました:
         
         【矛盾】
         - Line 15: "anyは禁止"
         - Line 42: "anyを使ってもOK"
         
         【重複セクション】
         - "Tests" (Line 20)
         - "テスト" (Line 55)
         
         自動処理できません。
         手動での整理をお勧めします。
         
         現在は読み取り専用モードで動作します。
         整理が完了したら、再度分析を実行してください:
           onboarding({ action: 'analyze' })」

User: (手動で指示書を整理)

Copilot: 「指示書が更新されたことを検出しました。
         再分析しますか？」

User: "はい"

Copilot: (analyze を再実行)
         「✓ 問題が解決されました。
         構造化済みの指示書として認識しました。
         通常モードで動作します。」
```

#### シナリオC: 承認拒否

```
User: "マイグレーションは拒否します"

Copilot: 「承認を拒否しました。
         読み取り専用モードで動作します。
         
         利用可能な機能:
         - guidance (使い方ガイド)
         - instructions_structure: read (読み取りのみ)
         - project_context (プロジェクト文脈管理)
         
         制限される機能:
         - 指示書の更新・削除・挿入
         - change_context による動的生成
         
         いつでも再検討できます:
           onboarding({ action: 'propose' })」
```

---

### 実装要件まとめ

#### 新規実装が必要

**1. onboarding ツール**:
- ✅ `analyze`: 既存指示書の分析と分類
- ✅ `propose`: マイグレーション提案
- ✅ `approve`: ユーザー承認の記録
- ✅ `migrate`: 安全なマイグレーション実行
- ✅ `rollback`: マイグレーション取り消し
- ✅ `status`: オンボーディング状態確認

**2. 分析ロジック**:
- セクション構造の検出（正規表現ベース）
- 矛盾検出（キーワードベース）
- 重複検出（見出しの類似度）
- 非構造化コンテンツの自然言語処理（LLM活用）

**3. マイグレーション実行**:
- バックアップ作成（タイムスタンプ付き）
- アトミックな書き換え
- ロールバック機能（24時間保持）

**4. 機能制限モード**:
- オンボーディング状態の永続化（`.copilot-state/onboarding-status.json`）
- ツールごとのアクセス制御
- 制限モード時のメッセージ

**5. ユーザー通知**:
- guidance ツールの拡張（オンボーディング状態の表示）
- 初回実行時の自動分析
- 制限モード時の明確なメッセージ

#### 既存機能の拡張

**1. instructions_structure**:
- 制限モードでの動作（read のみ許可）
- オンボーディング状態のチェック

**2. change_context**:
- 制限モードでの動作（実行不可）
- オンボーディング完了後に有効化

**3. guidance**:
- オンボーディング状態の表示
- 次のステップの案内

---

### 成功基準

#### Phase A（検出と分析）
- [ ] 既存指示書の存在確認
- [ ] 4パターンの分類（clean/structured/unstructured/messy）
- [ ] 問題点の検出（矛盾/重複/不明瞭）
- [ ] 推奨アクションの提示

#### Phase B（提案）
- [ ] マイグレーション計画の生成
- [ ] プレビュー表示
- [ ] リスク評価
- [ ] ユーザー承認のUI

#### Phase C（実行）
- [ ] バックアップ作成
- [ ] アトミックなマイグレーション
- [ ] ロールバック機能
- [ ] 24時間以内のロールバック保証

#### Phase D（制限モード）
- [ ] オンボーディング状態の永続化
- [ ] ツールごとのアクセス制御
- [ ] 制限モード時のメッセージ
- [ ] 承認後の通常モード移行

---

### 今後の拡張可能性

1. **段階的マイグレーション**
   - 一部のセクションのみ移行
   - 残りは後で移行

2. **マイグレーション履歴**
   - 複数回のマイグレーションを記録
   - 任意の時点へのロールバック

3. **チームでの承認**
   - 複数人での承認フロー
   - 投票システム

4. **自動修復提案**
   - 矛盾の自動解決案
   - LLMを活用した統合提案

---

### 実装優先度

🔴 **Phase A（検出と分析）**: 最優先
- 実運用で必須
- 既存プロジェクトへの導入の第一歩

🔴 **Phase D（制限モード）**: 最優先
- ユーザーの許可なしに変更しない保証
- 信頼性の基盤

🟡 **Phase B（提案）**: 高優先度
- ユーザーエクスペリエンスの向上
- 導入障壁の低減

🟡 **Phase C（実行）**: 高優先度
- Phase Bとセット
- 安全性の確保

---

### まとめ

このScenario 14の実装により:
- ✅ **既存プロジェクトへの安全な導入**
- ✅ **ユーザーのエッセンスを壊さない**
- ✅ **明示的な承認フロー**
- ✅ **機能制限モードで安全性確保**
- ✅ **いつでもロールバック可能**

実運用での信頼性が大幅に向上します。
