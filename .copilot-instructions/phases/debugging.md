---
category: phases
tags: [debugging, troubleshooting, fix]
priority: high
required: false
phases: [debugging]
---

# デバッグフェーズの指示

## デバッグの手順

1. **問題の再現**: 確実に再現できる状態を作る
2. **仮説立案**: 原因の仮説を立てる
3. **検証**: console.log やデバッガーで検証
4. **修正**: 最小限の変更で修正
5. **テスト追加**: 同じ問題が再発しないようテスト追加

## デバッグツール

- `console.log()`: 変数の値を確認
- `console.trace()`: スタックトレースを表示
- VS Code デバッガー: ブレークポイント設定
