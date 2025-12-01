# Copilot Custom Instructions for mcp-copilot-instructions

- 主目的: LLMのコンテキスト制約を「指示書の動的更新」で突破し、AI挙動の安定化と再現性を確保する。
- 主体: **Copilot (LLM自身)** は毎ターン冒頭で本指示書を読み、差分を検知・遵守・更新する。
- 注意: 本プロジェクトでの「ユーザー」は主に\*\*Copilot (LLM)\*\*を指す。人間開発者はCopilot経由でMCPツールを使用。

## 用語の定義

- **Copilot**: GitHub Copilot (LLM)。本MCPサーバの主要利用者。自らMCPツールを呼び出してコンテキストを管理。
- **人間開発者**: Copilotを使用する実際の開発者。Copilotに指示を出し、最終判断を行う。
- **MCPツール**: Copilotが呼び出す3つのツール (`guidance`, `project_context`, `instructions_structure`)。
- **指示書**: `.github/copilot-instructions.md`。Copilotが読むプロジェクト固有の指示。
- **プロジェクトコンテキスト**: `.copilot-context/contexts.json`。制約・規約・パターン等の構造化情報。

## 運用ポリシー

- 定期レビュー: 本指示書と`docs/operation-scenarios.md`は実装進行に合わせて定期的に見直す（最低週1、重要変更時は即時）。
- 変更の定着: 会話で決まった方針・修正は必ずツールで本指示書と`project_context`へ反映し、整合性チェックまで完了条件とする。
- 矛盾管理: 旧ルールの無効化と新ルールの優先度を明示（`project_context.constraints`/`conventions`）。

## 実装原則

- ツール定義は必ず`action`引数でCRUDを切替える。
- 正誤例（✅/❌）を指示書に併記して、Copilot (LLM)の想起安定性を高める。
- 重要変更後は、Copilot自身が効果と副作用を検証し、必要なら指示書を更新。
- **Copilotの役割**: MCPツールを能動的に使用し、自らのコンテキストを管理・改善する。
- **人間開発者の役割**: 最終判断、フィードバック提供、方針決定。

## 参照

- 設計: `docs/mcp-server-design.md`
- 運用: `docs/operation-scenarios.md`
- 調査: `research/copilot-instructions-research.md`
- バックログ: `docs/PRODUCT_BACKLOG.md` - 将来実装すべき機能（外部変更検知等）

## テスト原則

- Scenario 1, 2, 3を順次実装し、各段階で動作確認を行う。
- MCPツール経由でのテストを優先し、実際の使用感を確認する。
- ファイルI/O、JSON persistence、Markdown ASTの3つの基本パターンを確立する。

## 実装状況

- ✅ Scenario 1: guidance (ファイルI/O) - 実ファイル読み取り、エラーハンドリング
- ✅ Scenario 2: project\_context (JSON永続化) - create/read実装
- ✅ Scenario 3: instructions\_structure (Markdown AST) - セクション読み取り・更新
- ✅ Scenario 4: project\_context完全CRUD - update/delete/filter実装、action混入バグ修正
- ✅ Scenario 5: 実プロジェクト活用 - 本プロジェクトをMCPツールで管理、UX改善（summary表示追加）
