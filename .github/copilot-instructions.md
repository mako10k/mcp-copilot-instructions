# Copilot Custom Instructions for mcp-copilot-instructions

- 主目的: LLMのコンテキスト制約を「指示書の動的更新」で突破し、AI挙動の安定化と再現性を確保する。
- 主体: Copilotは毎ターン冒頭で本指示書を読み、差分を検知・遵守・更新する。

## 運用ポリシー

- 定期レビュー: 本指示書と`docs/operation-scenarios.md`は実装進行に合わせて定期的に見直す（最低週1、重要変更時は即時）。
- 変更の定着: 会話で決まった方針・修正は必ずツールで本指示書と`project_context`へ反映し、整合性チェックまで完了条件とする。
- 矛盾管理: 旧ルールの無効化と新ルールの優先度を明示（`project_context.constraints`/`conventions`）。

## 実装原則

- ツール定義は必ず`action`引数でCRUDを切替える。
- 正誤例（✅/❌）を指示書に併記して、想起の安定性を高める。
- 重要変更後は`adaptive_instructions(analyze)`で効果と副作用を検証し、必要ならロールバック。

## 参照

- 設計: `docs/mcp-server-design.md`
- 運用: `docs/operation-scenarios.md`
- 調査: `research/copilot-instructions-research.md`

## テスト原則

- Scenario 1, 2, 3を順次実装し、各段階で動作確認を行う。
- MCPツール経由でのテストを優先し、実際の使用感を確認する。
- ファイルI/O、JSON persistence、Markdown ASTの3つの基本パターンを確立する。
