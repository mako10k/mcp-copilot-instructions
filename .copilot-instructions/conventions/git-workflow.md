---
category: conventions
tags: [git, workflow, branching]
priority: medium
required: false
phases: [development, refactoring]
---

# Git ワークフロー

## ブランチ戦略

- `main`: 本番環境
- `feature/xxx`: 新機能開発
- `fix/xxx`: バグ修正
- `refactor/xxx`: リファクタリング

## コミットメッセージ

```
<type>: <subject>

<body>
```

### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `test`: テスト追加
