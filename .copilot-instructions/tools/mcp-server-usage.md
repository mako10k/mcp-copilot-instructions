---
category: tools
tags: [mcp, tools, essential]
priority: high
required: true
phases: [development, refactoring, testing, debugging, documentation]
---

# MCP Copilot Instructions Server の使い方

## 基本コンセプト

このMCPサーバは、**LLMのアテンション分散問題を解決**するために、巨大な指示書データベースから**今必要な指示だけを動的に抽出**します。

## 主要ツール

### `change_context` - 開発文脈の変更

現在の開発フェーズや焦点を変更すると、自動的に最適な指示書が生成されます。

```typescript
// 使用例: 開発フェーズに移行
change_context({
  action: "update",
  state: {
    phase: "development",
    focus: ["API認証", "JWT"],
    priority: "high"
  }
})
```

### 利用可能なphase

- `development`: 新機能開発
- `refactoring`: コードリファクタリング
- `testing`: テスト作成・修正
- `debugging`: バグ修正
- `documentation`: ドキュメント作成

## 動的指示書生成の仕組み

1. **change_context実行**: 開発文脈を設定
2. **自動スコアリング**: 現在のphase/focusから関連指示を計算
3. **指示書生成**: 必須指示 + 関連指示（最大10セクション）を抽出
4. **LLMが集中**: 今必要な指示だけでアテンションを集中

## 必須指示（常に含まれる）

- この使い方ガイド（tools/mcp-server-usage.md）
- TypeScript規約（conventions/typescript.md）
