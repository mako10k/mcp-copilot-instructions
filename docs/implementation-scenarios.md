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
