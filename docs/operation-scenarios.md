# 運用シナリオ: mcp-copilot-instructions 開発

**作成日**: 2025年12月1日  
**バージョン**: 1.0.0

---

## 冒頭定義（本プロジェクトの前提と目的）

- **ユーザの状態・性質は与条件**: ユーザの記憶精度・判断力・論理的思考・学習力は尊重しつつも、本プロジェクトではユーザ側の改善を直接の目的とはしない。
- **LLMの制約を突破する**: 現在のLLMが持つコンテキストウィンドウの制約や持続記憶の欠如による「忘却」「再現性の揺らぎ」を、会話ログではなく「指示書の動的更新」を通じて克服する。
- **指示書＝外部記憶の主軸**: 各チャットターン冒頭で必ず読み込まれる`.github/copilot-instructions.md`を、MCPツール群で継続的・構造的・一貫的に更新し、Copilotが毎回同じ土台から判断できる状態を維持する。
- **主対象はAIの挙動の安定化**: ユーザの指示は最小限の意図提示に留め、Copilotが能動的に指示書・コンテキスト・フィードバックをCRUDすることで、挙動の安定化と品質向上を実現する。

## ペルソナ定義

### 1. まこと（開発者）
- **役割**: MCPサーバ開発を行うプログラマ
- **目標**: `mcp-copilot-instructions`というMCPサーバを実装する
- **課題**: 
  - チャットのコンテキストウィンドウが小さいため、AIが過去の判断を忘れがち
  - 人手での指示書メンテは行わず、AIが自律的に更新する必要がある
- **強み**: 
  - 指示書は毎ターンAIが読み込む「外部記憶」であることを理解している
  - 指示の提示は最小限にし、更新はCopilotに委ねる

#### ユーザ側の課題（インタラクション視点）
- **記憶誤解**: LLMのコンテキストウィンドウは小さい。過去の指示・指摘が常に「記憶されている」と仮定して会話を進めると、AIは覚えていないことがある。
- **ポリシーの揺らぎ**: ユーザ自身の指示が誤っていたり、矛盾していることがある（ポリシーや信念が含まれるため）。この矛盾は会話だけでは解消しづらい。
- **人間扱いの落とし穴**: AIを人と同じ持続記憶で扱うと齟齬が生じる。外部記憶（指示書）へ明示的に反映する前提が必要。
- **再現性の不足**: 同じ意図でも表現が毎回変わり、AI側で一貫した追従が難しくなる。

#### ユーザ側のベストプラクティス（会話運用）
- **指示は短く要点のみ**: 長文で語らず、要件・制約・優先度を箇条書きで提示。
- **変更は指示書に反映**: 会話での新方針や修正は、Copilotにツールで指示書へ反映させる（会話ログに頼らない）。
- **矛盾は明示**: 旧方針と新方針の差分を明示し、旧方針の破棄・更新を指示書へ記録。
- **確認質問を許可**: 不一致時はCopilotの質問を許容し、指示書更新までを完了定義に含める。

### 2. Copilot（AIアシスタント）
- **役割**: MCPサーバのユーザー（MCPクライアント機能も持つ）
- **能力**: 
  - 毎ターン冒頭に指示書を読み、差分を検知して自律的に遵守する
  - MCPツールで指示書・コンテキスト・フィードバックを能動的にCRUDし、自己改善する
  - コード生成・修正を行い、失敗を自ら記録・反映する
- **制約**: 
  - コンテキストウィンドウは有限だが、指示書を外部記憶として活用可能
  - 会話履歴は薄れるため、必ず指示書とコンテキストから再構築する

---

## シナリオ1: プロジェクト初日 - セットアップと初期実装

### 状況
プロジェクトが初期化前の状態。Copilotは指示書の有無と現状を確認し、初期セットアップを主導する。

### 会話の流れ

#### ターン1: プロジェクト開始

**まこと**: 
> 目的: `.github/copilot-instructions.md`を動的にメンテするMCPサーバ。ツール: guidance / instructions_structure / project_context / user_feedback / adaptive_instructions。
> セットアップはCopilotが主導して進めてください。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む（まだ存在しない）
2. guidance ツールを使って現在の状態を確認
```

**Copilot → MCPサーバ**:
```typescript
guidance({ topic: "current-state" })
// 結果: プロジェクトは未初期化
```

**Copilot**: 
> 現状: 未初期化。指示書は未存在。
> 実施計画: (1) プロジェクト構造作成 (2) 設定ファイル整備 (3) 指示書初期化。
> まず`project_context`へ初期アーキテクチャを登録し、指示書に要旨を作成します。

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "create",
  context: {
    category: "architecture",
    title: "MCP Server Structure",
    description: "TypeScript based MCP server with 5 main tools",
    priority: "high",
    tags: ["mcp", "typescript", "server"],
    details: {
      frameworks: ["@modelcontextprotocol/sdk"],
      languages: ["TypeScript"],
      rules: [
        "Use action parameter for CRUD operations",
        "Keep tool count minimal",
        "Validate all inputs"
      ]
    }
  }
})
```

**Copilot → 指示書作成**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 1,
    content: "# mcp-copilot-instructions Development Guidelines"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "paragraph",
    content: "This project implements an MCP server for dynamic management of copilot-instructions.md",
    position: "last-child"
  }
})
```

**まこと**: 
> よし、いい感じ。次にTypeScriptの設定とフォルダ構造を作ってくれ。

---

#### ターン2: 実装開始

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
   内容: "MCP server with 5 main tools, use action parameter, TypeScript"
2. project_context を読んで詳細を確認
```

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "read",
  filter: { category: "architecture" }
})
// 結果: MCP Server Structure の詳細を取得
```

**Copilot**: 
> 了解しました。設計ドキュメントに基づいてフォルダ構造を作成します。
> 
> ```
> src/
>   ├── tools/
>   │   ├── guidance.ts
>   │   ├── instructions_structure.ts
>   │   ├── project_context.ts
>   │   ├── user_feedback.ts
>   │   └── adaptive_instructions.ts
>   ├── types/
>   │   └── schemas.ts
>   ├── storage/
>   │   └── storage.ts
>   └── index.ts
> ```

[ファイルを作成...]

**まこと**: 
> 次は`guidance`ツールの実装をお願いします（設計準拠）。

---

#### ターン3: guidance実装（失敗例）

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
2. 指示書には「action parameter を使う」とあるが、具体例がない
3. 過去のコンテキストが薄れている...
```

**Copilot**: 
> guidanceツールを実装します...

```typescript
// 間違い: action パラメータを忘れている
server.tool("guidance", async (params: { topic?: string }) => {
  // ...
})
```

**まこと**: 
> 設計準拠のため、`action`パラメータの必須化を徹底してください。

**Copilot（自己認識）**: 
> 指示の具体例が不足していたため、パターンの想起に失敗。以降は失敗を自動記録し、指示書へ具体例を追記して再発を防止します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "error-report",
    severity: "medium",
    category: ["implementation", "api-design"],
    description: "Forgot to include action parameter in tool definition",
    context: {
      task: "Implementing guidance tool",
      expectedBehavior: "All tools should use action parameter for CRUD",
      actualBehavior: "Tool defined without action parameter"
    },
    sentiment: {
      score: -0.3,
      emotion: "frustrated"
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## Tool Implementation Pattern",
    position: "last-child"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "code",
    content: `\`\`\`typescript
// ✅ CORRECT: All tools MUST have action parameter
server.tool("tool_name", {
  action: z.enum(["create", "read", "update", "delete"]),
  // ... other params
}, async (params) => { /* ... */ })

// ❌ WRONG: Missing action parameter
server.tool("tool_name", {
  topic: z.string()
}, async (params) => { /* ... */ })
\`\`\``,
    position: "last-child"
  }
})
```

**Copilot → 問題解決記録**:
```typescript
user_feedback({
  action: "resolve",
  resolution: {
    feedbackId: "fb-001",
    action: "instruction-updated",
    description: "Added tool implementation pattern with code examples to instructions",
    changes: ["Added '## Tool Implementation Pattern' section with correct/incorrect examples"],
    preventionStrategy: "All future tool implementations will reference this pattern"
  }
})
```

**Copilot**: 
> 失敗を記録し、指示書を更新しました。次回からはこのパターンを参照します。
> 正しい実装に修正します...

---

## シナリオ2: 2日目 - 継続開発と過去の失敗の回避

### 状況
新しいチャットセッション。Copilotは指示書から前回の失敗学習を想起し、実装の整合性を維持する。

### 会話の流れ

#### ターン4: 新セッション開始

**まこと**: 
> `project_context`ツールの実装を進めてください。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
   内容: "MCP server with 5 tools"
   内容: "## Tool Implementation Pattern" のコード例を発見！
   → actionパラメータが必須だと理解
2. 前日のコンテキストはないが、指示書から学習
```

**Copilot → MCPサーバ**:
```typescript
guidance({ topic: "current-state" })
// 結果: guidance ツールは実装済み、project_context は未実装
```

**Copilot**: 
> 承知しました。指示書のパターンに従って`project_context`を実装します。

```typescript
// ✅ 正解: action パラメータを含めている
server.tool("project_context", {
  action: z.enum(["create", "read", "update", "delete"]),
  filter: z.object({
    category: z.enum([...]).optional(),
    // ...
  }).optional(),
  context: z.object({...}).optional(),
  id: z.string().optional()
}, async (params) => {
  switch (params.action) {
    case "create": return await createContext(params.context);
    case "read": return await readContexts(params.filter);
    // ...
  }
})
```

**まこと**: 
> 完璧！前回の失敗を覚えててくれたんだね。

---

#### ターン5: 複雑なロジック実装

**まこと**: 
> 次に`adaptive_instructions`の`analyze`機能（規約違反検出）をお願いします。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. adaptive_instructions の仕様を確認したい
```

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "read",
  filter: { 
    category: "architecture",
    tags: ["adaptive_instructions"]
  }
})
// 結果: 詳細な仕様が見つからない
```

**Copilot**: 
> `adaptive_instructions`の詳細仕様が見つかりません。設計ドキュメントを確認して、具体的な要件を教えてください。

**まこと**: 
> なるほど。設計書の内容をプロジェクトコンテキストに登録しておくべきだったな。

**まこと → Copilot**: 
> docs/mcp-server-design.md の「adaptive_instructions」セクションを読んで、その内容をproject_contextに登録してくれ。

**Copilot**: 
> [ドキュメントを読む...]
> 
> 了解しました。登録します。

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "create",
  context: {
    category: "patterns",
    title: "adaptive_instructions - analyze action",
    description: "Analyzes codebase health, error patterns, and Copilot effectiveness",
    priority: "high",
    tags: ["adaptive_instructions", "analysis", "codebase"],
    details: {
      rules: [
        "Check codebase for convention violations",
        "Detect error patterns from git history",
        "Measure Copilot acceptance rate if possible",
        "Return structured analysis with scores (0-100)"
      ],
      examples: [
        "conventionsFollowed: 85 means 85% compliance",
        "Suggest improvements based on detected issues"
      ]
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## adaptive_instructions Analysis Requirements"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "list",
    content: [
      "Must check convention compliance (return 0-100 score)",
      "Detect recurring error patterns in git log",
      "Provide actionable suggestions",
      "Analysis should complete within 10 seconds"
    ],
    position: "last-child"
  }
})
```

**Copilot**: 
> 次回以降はこの情報を指示書から自動想起し、実装に反映します。

---

## シナリオ3: 1週間後 - バグ修正と学習の蓄積

### 状況
`instructions_structure`が特定のMarkdown構造で失敗。Copilotが原因分析・修正・指示書反映まで主導する。

### 会話の流れ

#### ターン10: バグ報告

**まこと**: 
> ネストしたリスト更新で失敗しています。原因分析・修正と、再発防止の指示書反映までお願いします。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. 過去に同じバグがあったか確認
```

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "read",
  filter: {
    type: "error-report",
    category: ["instructions_structure"]
  }
})
// 結果: 同様のバグ報告はまだない
```

**Copilot**: 
> このバグを記録してから修正します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "error-report",
    severity: "high",
    category: ["instructions_structure", "markdown-parsing"],
    description: "Nested list updates fail with 'Cannot find target element' error",
    context: {
      task: "Updating nested list in instructions",
      actualBehavior: "Error thrown when list depth > 2",
      relatedFiles: ["src/tools/instructions_structure.ts"]
    },
    sentiment: {
      score: -0.6,
      emotion: "frustrated"
    }
  }
})
```

**Copilot**: 
> [バグを調査して修正...]
> 
> 問題を特定しました。AST走査時に子ノードの再帰処理が不足していました。

**Copilot**: 
> 修正を記録し、再発防止策を指示書とプロジェクトコンテキストへ反映します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "resolve",
  resolution: {
    feedbackId: "fb-015",
    action: "bug-fixed",
    description: "Fixed nested list handling by implementing recursive AST traversal",
    changes: [
      "Added recursive traverseChildren() function",
      "Updated selector matching to handle depth > 2",
      "Added unit tests for nested structures"
    ],
    preventionStrategy: "Always test with deeply nested structures. Added to test checklist."
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## Known Issues and Solutions"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "paragraph",
    content: "### Markdown Parsing - Nested Structures\n\n" +
             "**Issue**: AST traversal must handle arbitrary nesting depth.\n\n" +
             "**Solution**: Always use recursive traversal, not loop-based.\n\n" +
             "**Test**: Verify with list depth >= 3 before committing.",
    position: "last-child"
  }
})
```

**Copilot → プロジェクトコンテキスト更新**:
```typescript
project_context({
  action: "create",
  context: {
    category: "constraints",
    title: "Markdown Parsing Requirements",
    description: "Critical requirements for safe markdown AST manipulation",
    priority: "critical",
    tags: ["markdown", "ast", "parsing", "instructions_structure"],
    details: {
      rules: [
        "MUST support arbitrary nesting depth",
        "MUST use recursive traversal for child nodes",
        "MUST test with depth >= 3",
        "NEVER assume flat structure"
      ],
      examples: [
        "Use: function traverse(node) { node.children?.forEach(traverse) }",
        "Avoid: for (let i = 0; i < 2; i++) { /* fixed depth */ }"
      ]
    }
  }
})
```

---

## シナリオ4: 2週間後 - プロジェクト成熟期

### 状況
プロジェクトは安定してきた。まことは新しい機能を追加したい。

### 会話の流れ

#### ターン25: 新機能提案

**まこと**: 
> `adaptive_instructions`に、時間帯によって指示を変える機能を追加したい。例えば、深夜はより慎重なコードレビューを促すとか。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. adaptive_instructions の現在の仕様を確認
3. 過去の失敗パターンを確認
```

**Copilot → MCPサーバ**:
```typescript
// まず現在の仕様を確認
project_context({
  action: "read",
  filter: { tags: ["adaptive_instructions"] }
})

// 過去の問題を確認
user_feedback({
  action: "read",
  filter: {
    category: ["adaptive_instructions"],
    status: "resolved"
  }
})

// 類似機能がないか確認
guidance({ topic: "current-state" })
```

**Copilot**: 
> 面白いアイデアですね。実装前にいくつか確認させてください：
> 
> 1. 時間帯の判定はローカル時間ですか？UTCですか？
> 2. 時間帯別の指示は`.github/copilot-instructions.md`に直接反映しますか？
> 3. 過去の実装パターンを見ると、一時的な指示は`expiresAt`で管理していますが、
>    時間帯による切り替えも同じ仕組みを使いますか？

**まこと**: 
> さすが！過去の実装パターンを覚えてるんだね。そう、`expiresAt`の仕組みを拡張する形で。

**Copilot → 設計記録**:
```typescript
project_context({
  action: "create",
  context: {
    category: "patterns",
    title: "Time-based Adaptive Instructions",
    description: "Automatically adjust instructions based on time of day",
    priority: "medium",
    tags: ["adaptive_instructions", "time-based", "automation"],
    details: {
      rules: [
        "Use cron-like syntax for time specifications",
        "Build on existing expiresAt mechanism",
        "Store time-based rules in separate config file",
        "Default time zone: project's primary timezone"
      ],
      examples: [
        "Night mode (22:00-06:00): Enhanced code review prompts",
        "Sprint end (Friday 15:00+): Extra testing reminders"
      ],
      references: [
        "src/tools/adaptive_instructions.ts#expiresAt"
      ]
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "update",
  selector: {
    type: "heading",
    content: "adaptive_instructions"
  },
  element: {
    type: "list",
    content: [
      "Supports scenario-based instruction generation",
      "Manages temporary instructions with expiresAt",
      "NEW: Time-based automatic instruction switching",
      "Integrates with project_context for rule storage"
    ],
    position: "after"
  }
})
```

**Copilot**: 
> 設計を記録しました。これにより：
> 
> 1. 将来の私（または別のCopilotインスタンス）がこの機能を理解できる
> 2. 既存の`expiresAt`パターンと一貫性を保てる
> 3. 実装時に判断に迷わない
> 
> 実装を開始しますか？

---

## シナリオ5: 指示書の自己進化

### 状況
1ヶ月が経過。指示書は大きく成長し、Copilotは多くのことを「記憶」している。

### 会話の流れ

#### ターン50: メタ的な改善

**まこと**: 
> 指示書が長くなりすぎて、トークンを圧迫してないか心配だ。最適化できる？

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む（約8000トークン）
2. 指示書自体のメタ分析が必要
```

**Copilot → MCPサーバ**:
```typescript
adaptive_instructions({
  action: "analyze",
  analysisContext: {
    copilotPerformance: true
  }
})
```

**Copilot**: 
> 分析結果：
> - 指示書のサイズ: 8,247トークン
> - 使用頻度の高いセクション: Tool Implementation Pattern (90%)
> - 使用頻度の低いセクション: Known Issues (15%)
> 
> 提案：
> 1. 低頻度セクションを別ファイルに移動
> 2. 重要度でセクションを並べ替え
> 3. 冗長な説明を圧縮

**まこと**: 
> いいね。それを実行して、その判断プロセス自体も記録してくれ。

**Copilot → MCPサーバ**:
```typescript
// 新しいコンテキストを作成
project_context({
  action: "create",
  context: {
    category: "conventions",
    title: "Instruction Optimization Policy",
    description: "Guidelines for keeping copilot-instructions.md efficient",
    priority: "high",
    tags: ["meta", "optimization", "instructions"],
    details: {
      rules: [
        "Maximum 10,000 tokens for main instructions file",
        "Usage frequency < 20% → move to supplementary docs",
        "Critical patterns always at top",
        "Review and optimize monthly"
      ],
      examples: [
        "High priority: Tool patterns, API conventions",
        "Low priority: Detailed error histories, old issues"
      ]
    }
  }
})
```

**Copilot → 実行**:
```typescript
// 低頻度セクションを移動
instructions_structure({
  action: "read",
  selector: {
    type: "heading",
    content: "Known Issues and Solutions"
  }
})
// → 内容を .github/copilot-supplementary.md に移動

// 指示書に参照を追加
instructions_structure({
  action: "update",
  selector: {
    type: "heading",
    content: "Known Issues and Solutions"
  },
  element: {
    type: "paragraph",
    content: "See [Supplementary Documentation](.github/copilot-supplementary.md) for detailed issue history."
  }
})
```

**Copilot → 自己改善記録**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "suggestion",
    severity: "low",
    category: ["meta", "optimization"],
    description: "Successfully optimized instructions from 8247 to 5100 tokens",
    context: {
      task: "Instruction optimization",
      expectedBehavior: "Keep instructions under 10k tokens",
      actualBehavior: "Reduced by 38% while maintaining effectiveness"
    },
    sentiment: {
      score: 0.8,
      emotion: "satisfied"
    }
  }
})
```

**Copilot**: 
> 最適化完了：
> - 元のサイズ: 8,247トークン → 新サイズ: 5,100トークン（38%削減）
> - 重要な情報はすべて保持
> - 詳細情報は補助ドキュメントで参照可能
> 
> この最適化プロセス自体を記録したので、次回から自動的に判断できます。

---

## 学習効果の分析

### Before（指示書動的更新なし）

| ターン | 問題 | 結果 |
|--------|------|------|
| 5 | actionパラメータを忘れる | 手動で修正、次回も忘れる |
| 15 | 同じパターンで再度失敗 | また手動修正 |
| 25 | 過去の修正を思い出せない | 再調査に時間を浪費 |
| 50 | 同じバグを3回目に踏む | フラストレーション増大 |

### After（指示書動的更新あり・Copilot主導）

| ターン | MCPサーバの働き | 結果 |
|--------|------------------|------|
| 5 | 失敗を記録、指示書に例を追加 | 次回から正しく実装 |
| 15 | 指示書を読んで過去の学習を再現 | 同じ失敗なし |
| 25 | プロジェクトコンテキストから設計を取得 | 一貫性のある実装 |
| 50 | 自己分析して指示書を最適化 | 効率が向上し続ける |

### 定量的効果

```
失敗の繰り返し削減: 85%
実装速度向上: 45%
コンテキスト切り替えコスト: -60%
開発者の満足度: +70%
```

---

## 重要な気づき

### 1. 指示書は「外部メモリ」
Copilotのコンテキストウィンドウは小さいが、指示書は毎ターン読まれる。
→ **指示書 = Copilotの永続的な記憶装置**

### 2. 失敗から学ぶサイクル
```
失敗 → 記録 → 指示書更新 → 次回成功 → パターン化
```
このサイクルを回すことで、プロジェクト固有の知識が蓄積される。

### 3. メタ認知の実現
Copilot自身が自分の振る舞いを分析し、指示書を改善できる。
→ **自己改善するAIアシスタント**

### 4. 開発者の認知負荷削減
「前回何したっけ？」「どう実装するんだっけ？」という疑問が激減。
→ **開発者は本質的な判断に集中できる**

---

## ベストプラクティス

### 開発者（まこと）がすべきこと（ユーザ側視点の課題対応）

1. **会話でなく指示書へ定着**
  - 新方針・修正は会話で述べた直後に、Copilotへ`instructions_structure`または`project_context`での反映を依頼し、完了確認まで行う。

2. **記憶の前提を捨てる**
  - 「覚えているはず」という前提で進めない。毎ターン、Copilotが指示書を読み直すことを前提に、必要な変更は指示書へ。

3. **矛盾の管理**
  - 旧ルールの無効化と新ルールの優先度を明示。差分を`project_context`の`constraints`や`conventions`カテゴリに記録。

4. **具体例で合意形成**
  - ルールだけでなく、正誤コード例（✅/❌）を指示書へ追加し、Copilotの想起を安定化。

5. **検証をワークフローに組み込む**
  - 重要変更後は`adaptive_instructions(analyze)`を要求して効果と副作用を確認し、必要ならロールバックを指示。

### Copilot（AI）がすべきこと

1. **毎ターン指示書を読む**
   - 最新の指示とパターンを確認
   - 過去の失敗を繰り返さない

2. **不明点はツールで確認**
   - `guidance`で全体像を把握
   - `project_context`で詳細を取得

3. **失敗を記録する**
   - エラーが起きたら即座に`user_feedback`
   - 解決策も必ず記録

4. **自己改善を提案**
   - 指示書の矛盾や非効率を検出
   - 自発的に最適化を提案
  - 最適化提案は必ず`project_context`と指示書へ反映し、ユーザの方針に合致するか確認を取る

---

## まとめ

このシナリオが示すのは、**MCPサーバによって実現される新しい開発パラダイム**です：

### 従来の開発
```
人間 → AI → コード
  ↑____________↑ (フィードバックは人間の記憶頼み)
```

### MCPサーバを使った開発
```
人間 → AI → コード
  ↓     ↓
  指示書（共有記憶）
  ↓     ↓
  自己改善サイクル
```

指示書は静的文書ではなく、**Copilotが毎ターン参照する外部記憶**です。MCPツールによる動的更新によって、LLMのコンテキスト制約を越えて一貫性・再現性・安全性を維持します。

Copilot主導の更新サイクルにより、プロジェクトは**AI挙動の安定化**を継続的に達成し、ユーザは最小限の意図提示で高品質な結果を得られます。
