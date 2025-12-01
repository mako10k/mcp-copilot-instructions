# スプリント1バックログ

作成日: 2025-12-01 / スプリント長: 2週間
スプリントゴール: 指示書の外部記憶＋MVPツールで最小ループを成立

## スプリント項目
- T1: READMEの補強（目的/範囲/次の一手）
  - DoD: レビュー通過、CIリンク記載
- T2: guidanceツールMVP
  - DoD: overview/getting-started/current-state実装、ユニットテスト
- T3: instructions_structureのread/update（一部）
  - DoD: 見出し・段落の取得/編集が可能、テスト有り
- T4: project_contextのread（一覧/フィルタ）
  - DoD: カテゴリ/タグでフィルタ可能、テスト有り
- T5: CIの拡張（lint/format）
  - DoD: PR時チェック実施、失敗時に明示

## リスク
- GitHubプライベートのブランチ保護制限
- 設計の肥大化による初速低下

## 緩和策
- pre-pushフックでmain直push禁止
- MVPを厳格に維持（拡張はスプリント2以降）
