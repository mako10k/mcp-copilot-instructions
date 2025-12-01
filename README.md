# mcp-copilot-instructions

**LLMのアテンション分散問題を「文脈依存の動的指示書生成」で解決する**

## 課題
ガチガチに指示書を追記 → 膨大化 → LLMのアテンション分散 → 重要な指示が効かない

## 解決策
```
巨大な指示書データベース（.copilot-instructions/以下、Git管理）
    ↓ 文脈認識エンジン（MCPサーバ）
    ↓ ToDo管理から現在の状態・流れを把握
    ↓ 関連する指示だけを抽出
.github/copilot-instructions.md（動的生成）
    ↓ 今必要な指示だけに厳選
LLM（集中したアテンション）
```

## 目的
- **指示書の肥大化によるアテンション分散を防ぐ**: プロジェクト全体の知識は保持しつつ、LLMには「今の流れ」に必要な指示だけを提供
- **文脈依存の動的生成**: ToDoやタスク状態から、現在のフェーズに適切な指示を自動抽出
- **Git管理による変更履歴**: 指示書データベース全体をGit管理し、ブランチ戦略・レビュー・ロールバックを活用

## 重要: 用語の定義

本プロジェクトでは「ユーザー」が誰を指すかに注意が必要です:

- **Copilot (LLM)**: MCPツールの**主要利用者**。自らツールを呼び出してコンテキストを管理。
- **人間開発者**: Copilotを使用する実際の開発者。Copilotに指示を出し、最終判断を行う。

特に明記がない限り、「ユーザー」は**Copilot (LLM)自身**を指します。

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
