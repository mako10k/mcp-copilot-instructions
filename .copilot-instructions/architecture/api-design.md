---
category: architecture
tags: [api, rest, design]
priority: high
required: false
phases: [development]
---

# API設計の原則

## RESTful設計

- リソース指向のURL設計
- 適切なHTTPメソッド使用（GET/POST/PUT/DELETE）
- ステータスコードの正しい使用

## エンドポイント設計

```
GET    /api/users       # ユーザー一覧
GET    /api/users/:id   # ユーザー詳細
POST   /api/users       # ユーザー作成
PUT    /api/users/:id   # ユーザー更新
DELETE /api/users/:id   # ユーザー削除
```

## レスポンス形式

```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```
