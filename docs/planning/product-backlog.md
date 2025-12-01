# プロダクトバックログ

作成日: 2025-12-01

## エピック一覧
- E1: 指示書外部記憶の基盤
- E2: ローレベルAST編集
- E3: ハイレベル文脈管理
- E4: 適応的指示生成とロールバック
- E5: フィードバックの記録と分析
- E6: 運用オートメーション（CI/最適化）

## ストーリー（優先度: High/Med/Low）
- S1 (High): `.github/copilot-instructions.md`初期化と運用ポリシー記載
  - AC: 週次レビュー方針が明記され、CIで検知される
- S2 (High): `guidance`ツールのMVP
  - AC: overview/getting-started/current-stateを返す
- S3 (High): `project_context`のCRUD（create/read）
  - AC: カテゴリ/タグ/優先度でフィルタ可能
- S4 (High): `instructions_structure`のread/update
  - AC: 見出し/段落/コード/リストの選択・編集が可能
- S5 (Med): `user_feedback`のcreate/read
  - AC: 種別/重大度/カテゴリで集計可能
- S6 (Med): `adaptive_instructions`のanalyze/generate
  - AC: 規約順守スコア・改善提案を返す
- S7 (Low): ロールバック/適用機能
  - AC: バージョン指定で復元可能
- S8 (Med): 指示書最適化ルールの適用
  - AC: 使用頻度低セクションの分離と参照追加

## 非機能
- セキュリティ: 機密情報自動除外、ローカル保存
- 可用性: 失敗時のロールバック、変更履歴保持
- パフォーマンス: 10秒以内に分析完了
