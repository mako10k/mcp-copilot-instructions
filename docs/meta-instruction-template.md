# メタ指示テンプレート

このファイルは、MCPサーバが生成する `.github/copilot-instructions.md` に自動挿入される「メタ指示セクション」のテンプレートです。

---

## meta: ツール活用ガイド

このMCPサーバは、指示書の外部記憶と動的生成を担います。以下のツールを適切に活用してください。

### 開発状態の管理

開発フェーズや作業内容が変わる場合、必ず `change_context` ツールで状態を更新してください。

**使用タイミング**:
- フェーズ変更時（開発→テスト、テスト→デバッグ、など）
- 作業フォーカスの変更時（API実装→認証実装、など）

**実行方法**:
```json
{
  "action": "update",
  "state": {
    "phase": "testing",
    "focus": ["ユニットテスト", "カバレッジ"]
  }
}
```

**効果**: 状態変更後、この指示書は自動的に再生成され、現在のフェーズに適した指示が優先されます。

### 開発ルールの登録

ユーザーから新しい規約・ルール・制約の指示を受けた場合、その場限りの対応ではなく、必ず `project_context` に永続化してください。

**登録前の確認**:
1. 既存ルールを検索（`project_context read`）
2. 矛盾がないか確認
3. 矛盾がある場合、ユーザーに確認を求める

**実行方法**:
```json
{
  "action": "create",
  "category": "バリデーション",
  "title": "API関数のZodスキーマ検証",
  "description": "すべてのAPI関数の引数と戻り値にZodスキーマ検証を必須とする",
  "priority": 8,
  "tags": ["API", "Zod", "型安全性"]
}
```

**重要**: 一度登録したルールは、以降すべてのセッションで参照されます。散逸を防ぐため、必ず登録してください。

### 指示書の自己認識

`instructions_structure` ツールは、**この指示書自体**を変更するツールです。使用時は、以下を明示してください。

**注意事項**:
- update/delete/insert実行時は、変更内容を明示
- 「この指示書が変更されます」と警告
- 外部変更がある場合、競合検出機能（`detect-conflicts`）が自動作動

**実行例**:
```
⚠️ 注意: instructions_structureで指示書を更新します。
この操作により、この指示書自体が変更されます。

更新内容:
- セクション: conventions: TypeScript規約
- 追加: Partial型の積極活用
```

### 既存ルールとの整合性確認

新しい指示を受けた際、既存の `project_context` と矛盾しないか必ず確認してください。

**確認手順**:
1. 関連カテゴリを検索（`project_context read`）
2. 矛盾を検出した場合、ユーザーに選択肢を提示
3. ユーザーの選択に従って、既存ルールを更新または維持

**矛盾例**:
- 既存: Jest必須
- 新指示: Vitestに変更
→ ユーザーに確認が必要

### 既存プロジェクトへの導入

初回実行時、または既存の `copilot-instructions.md` がある場合、`onboarding` ツールで分析してください。

**実行方法**:
```json
{
  "action": "analyze"
}
```

**動作**:
- 互換性がある場合: 自動的に通常モードで動作
- 互換性がない場合: 機能制限モードで動作（読み取り専用）
- マイグレーション提案を確認後、承認を得て実行

---

## 補足: ツール一覧

| ツール | 用途 | 主要アクション |
|--------|------|----------------|
| `guidance` | システム状態確認 | overview, getting-started, current-state |
| `project_context` | 開発ルール管理 | create, read, update, delete |
| `instructions_structure` | 指示書のCRUD | read, update, delete, insert, detect-conflicts, resolve-conflict |
| `change_context` | 開発状態変更 | update, read, reset, rollback, list-history, show-diff |
| `feedback` | 重要フィードバック記録 | add, remove, list |
| `onboarding` | 既存プロジェクト導入 | analyze, status, skip, propose, approve, migrate, rollback |
