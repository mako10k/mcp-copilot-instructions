---
category: phases
tags: [refactoring, code-quality, cleanup]
priority: medium
required: false
phases: [refactoring]
---

# リファクタリングフェーズの指示

## リファクタリングの原則

1. **テストを先に書く**: 既存機能を壊さないことを保証
2. **小さなステップ**: 一度に一つの改善のみ
3. **頻繁にコミット**: 各改善ごとにコミット
4. **レビュー**: 変更の意図を明確に

## 重点ポイント

- 重複コードの削減（DRY原則）
- 関数の分割（単一責任の原則）
- 命名の改善（意図が伝わる名前）
- 不要なコードの削除
