# Copilot Custom Instructions for mcp-copilot-instructions

## 設計思想

### 本質的な課題
開発が進むにつれ指示書が膨大化 → LLMのアテンションが分散 → 「今の流れに必要な指示」が効かなくなる

### 解決アプローチ
1. **巨大な指示書データベース**: `.copilot-instructions/`以下に構造化された全知識を保存（Git管理）
2. **文脈認識エンジン**: MCPサーバがToDo管理などから「今の状態・流れ」を把握
3. **動的フィルタリング**: 現在の文脈に必要な指示だけを抽出して`.github/copilot-instructions.md`を生成
4. **LLMのアテンション集中**: 厳選された指示により、重要な内容に注力

### 運用の流れ
```
LLM: MCPツールで現在のToDoを報告 → MCPサーバ: 関連指示を抽出 → .github/copilot-instructions.md: 動的更新 → LLM: 最適化された指示で作業
```

---

## 基本方針

- 主目的: LLMのコンテキスト制約とアテンション分散を「動的な指示書生成」で突破する。
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
- バックログ: `docs/planning/product-backlog.md` - 将来実装すべき機能（外部変更検知等）

## テスト原則

これはテストセクションです。

## 実装状況

- ✅ Scenario 1: guidance (ファイルI/O) - 実ファイル読み取り、エラーハンドリング
- ✅ Scenario 2: project\_context (JSON永続化) - create/read実装
- ✅ Scenario 3: instructions\_structure (Markdown AST) - セクション読み取り・更新
- ✅ Scenario 4: project\_context完全CRUD - update/delete/filter実装、action混入バグ修正
- ✅ Scenario 5: 実プロジェクト活用 - 本プロジェクトをMCPツールで管理、UX改善（summary表示追加）
- ✅ Scenario 6: 外部変更検知（Phase 2開始）
  - Step 1: SHA-256ハッシュによる競合検知、安全な書き込み機構 ✅
  - Step 1.5: 競合マーカー方式実装 ✅ (2025-12-01)
    - セクション単位の自動マージ
    - Git風競合マーカー挿入
    - detect-conflicts/resolve-conflict アクション
    - 全6テストシナリオパス
  - Step 2: Git統合 ✅ (2025-12-01)
    - checkGitManaged/getGitStatus/getGitDiff/getGitCommit
    - FileStateにGit情報追加
    - instructions_structureでGit状態表示
    - 全7テストシナリオパス
- ✅ Scenario 7: Git統合 (PBI-001 Step 2) - 2025-12-01完了

## 存在しないセクション

テスト
