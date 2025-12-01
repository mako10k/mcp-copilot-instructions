---
category: conventions
tags: [typescript, coding-style, essential]
priority: high
required: true
phases: [development, refactoring, testing, debugging]
---

# TypeScript コーディング規約

## 型安全性

- すべての関数に明示的な戻り値の型を指定
- `any`型の使用は最小限に（やむを得ない場合のみ）
- `unknown`型を活用して型安全性を保つ

## 命名規則

- **変数/関数**: camelCase（例: `getUserData`, `totalCount`）
- **型/インターフェース**: PascalCase（例: `UserProfile`, `ApiResponse`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）

## ファイル構成

```typescript
// インポート順序
import { 標準ライブラリ } from 'node:fs';
import { サードパーティ } from 'express';
import { 内部モジュール } from '../utils';

// 型定義
interface MyType { }

// 定数
const CONSTANT = 'value';

// 関数
export function myFunction(): ReturnType { }
```
