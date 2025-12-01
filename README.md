# mcp-copilot-instructions

GitHub Copilotの`.github/copilot-instructions.md`を動的に更新・維持するMCPサーバ設計とドキュメント群です。LLMのコンテキスト制約を指示書の外部記憶化で突破し、AI挙動の安定化・再現性向上を目指します。

## 目的
- 指示書を「毎ターン参照される外部記憶」にする
- MCPツールで指示書・コンテキスト・フィードバックをCRUD
- 失敗の自動記録→具体例追記→再発防止

## 主要ドキュメント
- 設計: `docs/mcp-server-design.md`
- 運用: `docs/operation-scenarios.md`
- 調査: `research/copilot-instructions-research.md`
- 指示書: `.github/copilot-instructions.md`

## 運用ポリシー（抜粋）
- 定期レビュー: 週1以上、重要変更は即時反映
- 変更の定着: 会話で決まった方針は指示書・コンテキストへ反映
- 矛盾管理: 旧ルールの無効化と新ルールの優先を明示

## 開発の次の一手
- MCPツール群の実装（guidance / instructions_structure / project_context / user_feedback / adaptive_instructions）
- CIで週次レビューの自動チェックを有効化
