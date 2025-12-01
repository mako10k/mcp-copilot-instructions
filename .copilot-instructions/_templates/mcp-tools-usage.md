---
category: _templates
tags: [template, mcp, setup]
priority: high
required: false
phases: [development]
---

# MCPツール利用テンプレート

このファイルは、プロジェクトで本MCPサーバを使う際の基本テンプレートです。

## プロジェクト固有の設定

プロジェクトの特性に応じて、以下のカテゴリをカスタマイズ:

- `architecture/`: プロジェクトのアーキテクチャパターン
- `patterns/`: よく使う実装パターン
- `conventions/`: チーム固有のコーディング規約
- `phases/`: プロジェクト固有の開発フェーズ

## フロントマター設定

各Markdownファイルには以下のフロントマターを追加:

```yaml
---
category: カテゴリ名
tags: [タグ1, タグ2]
priority: high | medium | low
required: true | false  # 常に含める場合はtrue
phases: [development, refactoring, ...]
---
```
