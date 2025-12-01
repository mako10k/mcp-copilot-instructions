# MCP Copilot Instructions Server 設計書

**作成日**: 2025年12月1日  
**バージョン**: 1.0.0

---

## 1. 概要

このMCPサーバは、`.github/copilot-instructions.md`を動的にメンテナンスし、GitHub Copilotがプロジェクトのコンテキストをしっかりと理解し続けられるようにするためのツール群を提供します。

### 1.1 目的

- プロジェクトの状態変化に応じて指示書を最新に保つ
- LLMエージェントが「道を失わない」ように構造化された情報を管理
- ユーザーの意図や感情を記録し、適切な対応策を提供
- 指示書の品質を維持し、Copilotの効果を最大化

### 1.2 設計原則

1. **シンプルさ**: ツール数を最小限に抑え、action引数でCRUD操作を切り替え
2. **階層性**: ローレベル（構造操作）とハイレベル（意味操作）を分離
3. **安全性**: 変更履歴の記録とロールバック機能
4. **効率性**: トークン使用量を最適化し、必要な情報だけを提供
5. **拡張性**: 将来的な機能追加に対応できる設計

---

## 2. ツール設計

### 2.1 ガイダンス系ツール

#### 2.1.1 `guidance`

**目的**: MCPサーバの使い方と現在の状態をユーザーおよびLLMに提供

**パラメータ**:
```typescript
{
  topic?: "overview" | "getting-started" | "best-practices" | "examples" | "current-state"
}
```

**説明**:
- `overview`: サーバの全体像と利用可能なツールの概要
- `getting-started`: 初めて使用する際の手順
- `best-practices`: 効果的な使い方とアンチパターン
- `examples`: 一般的なユースケースとコード例
- `current-state`: 現在のプロジェクト状態と指示書の概要

**戻り値**:
```typescript
{
  topic: string;
  content: string;  // Markdown形式のガイダンス
  relatedTools: string[];  // 関連するツール名のリスト
  nextSteps?: string[];  // 推奨される次のアクション
}
```

---

### 2.2 ローレベルツール

#### 2.2.1 `instructions_structure`

**目的**: 指示書の構造を詳細に操作するためのCRUDツール（@mako10k/mcp-mdast を参考）

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete";
  
  // read時のフィルタリング
  selector?: {
    type?: "heading" | "paragraph" | "list" | "code" | "blockquote";
    level?: number;  // 見出しレベル (1-6)
    path?: string;  // セクションへのパス (例: "1.2.3")
    content?: string;  // コンテンツで検索
  };
  
  // create/update時のデータ
  element?: {
    type: "heading" | "paragraph" | "list" | "code" | "blockquote" | "table";
    level?: number;
    content: string | string[];  // Markdown形式
    position?: "before" | "after" | "first-child" | "last-child";
    anchor?: string;  // 挿入位置の基準となる要素のID or パス
    metadata?: {
      priority?: "high" | "medium" | "low";
      tags?: string[];
      lastUpdated?: string;
    };
  };
  
  // delete時の指定
  target?: string;  // 削除する要素のID or パス
}
```

**説明**:
- Markdown ASTを操作して指示書の構造を直接編集
- セクション、リスト項目、コードブロックなどを精密に制御
- メタデータを付与して優先度やタグ管理が可能

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  affected: {
    id: string;
    path: string;
    type: string;
    preview: string;  // 変更内容のプレビュー
  }[];
  document?: {
    structure: any;  // 現在のAST構造（read時）
    markdown?: string;  // Markdown形式（オプション）
  };
  errors?: string[];
}
```

---

### 2.3 ハイレベルツール

#### 2.3.1 `project_context`

**目的**: プロジェクトのコンテキスト情報を構造化して管理

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete";
  
  // read時のフィルタリング
  filter?: {
    category?: "architecture" | "conventions" | "dependencies" | "patterns" | "constraints";
    tags?: string[];
    priority?: "high" | "medium" | "low";
    updatedAfter?: string;  // ISO 8601形式
  };
  
  // create/update時のデータ
  context?: {
    id?: string;  // update時に必要
    category: "architecture" | "conventions" | "dependencies" | "patterns" | "constraints";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    tags?: string[];
    details?: {
      frameworks?: string[];
      languages?: string[];
      rules?: string[];
      examples?: string[];
      references?: string[];  // URL or ファイルパス
    };
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      author?: string;
      reviewStatus?: "draft" | "reviewed" | "approved";
    };
  };
  
  // delete時の指定
  id?: string;
}
```

**説明**:
- プロジェクトの技術スタック、アーキテクチャパターン、コーディング規約などを管理
- カテゴリ別に整理され、優先度とタグで検索可能
- 変更履歴を自動記録

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  contexts?: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    priority: string;
    tags: string[];
    details: any;
    metadata: any;
  }>;
  summary?: {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    recentChanges: number;
  };
  errors?: string[];
}
```

---

#### 2.3.2 `adaptive_instructions`

**目的**: 文脈や状態に応じて動的に指示書を調整

**パラメータ**:
```typescript
{
  action: "analyze" | "generate" | "apply" | "rollback";
  
  // analyze: 現在の状況を分析
  analysisContext?: {
    codebaseChanges?: boolean;  // コードベースの変更を分析
    recentErrors?: boolean;  // 最近のエラーパターンを分析
    teamFeedback?: boolean;  // チームのフィードバックを分析
    copilotPerformance?: boolean;  // Copilotの効果を評価
  };
  
  // generate: 新しい指示を生成
  generationContext?: {
    scenario: "new-feature" | "refactoring" | "bug-fix" | "performance" | "security";
    scope?: string[];  // 影響を受けるファイルやディレクトリ
    temporaryDuration?: string;  // 一時的な指示の有効期限（ISO 8601 duration）
    basedOn?: string[];  // 既存のコンテキストIDを基に生成
  };
  
  // apply: 生成された指示を適用
  instructionId?: string;
  
  // rollback: 以前の状態に戻す
  version?: string;  // 特定のバージョンに戻す
  timestamp?: string;  // 特定の時点に戻す
}
```

**説明**:
- コードベースの変化を検出し、必要に応じて指示を調整
- タスクやシナリオに応じた一時的な指示を生成
- 変更履歴を管理し、いつでもロールバック可能
- A/Bテストのような複数の指示パターンを試行可能

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  
  // analyze時
  analysis?: {
    codebaseHealth: {
      conventionsFollowed: number;  // 0-100
      inconsistencies: string[];
      suggestedImprovements: string[];
    };
    errorPatterns: Array<{
      pattern: string;
      frequency: number;
      suggestedInstruction: string;
    }>;
    copilotEffectiveness: {
      acceptanceRate: number;  // 0-100
      commonRejectionReasons: string[];
    };
  };
  
  // generate時
  generated?: {
    id: string;
    instructions: string;  // Markdown形式
    rationale: string;  // 生成理由
    expectedImpact: string;
    expiresAt?: string;
  };
  
  // apply時
  applied?: {
    instructionId: string;
    affectedSections: string[];
    backupVersion: string;
  };
  
  // rollback時
  rolledBack?: {
    fromVersion: string;
    toVersion: string;
    changes: string[];
  };
  
  errors?: string[];
}
```

---

#### 2.3.3 `user_feedback`

**目的**: ユーザーの感情、指摘、フィードバックを記録し、対処方法を管理

**パラメータ**:
```typescript
{
  action: "create" | "read" | "update" | "delete" | "resolve";
  
  // read時のフィルタリング
  filter?: {
    type?: "frustration" | "confusion" | "suggestion" | "praise" | "error-report";
    status?: "new" | "acknowledged" | "in-progress" | "resolved" | "wontfix";
    severity?: "critical" | "high" | "medium" | "low";
    category?: string[];  // 関連カテゴリ
    createdAfter?: string;
  };
  
  // create/update時のデータ
  feedback?: {
    id?: string;  // update時に必要
    type: "frustration" | "confusion" | "suggestion" | "praise" | "error-report";
    severity: "critical" | "high" | "medium" | "low";
    category: string[];  // 例: ["code-generation", "test-writing"]
    description: string;
    context?: {
      task?: string;  // 実行中だったタスク
      copilotResponse?: string;  // Copilotが生成したコード
      expectedBehavior?: string;
      actualBehavior?: string;
      relatedFiles?: string[];
    };
    sentiment?: {
      score: number;  // -1.0 (非常にネガティブ) ～ 1.0 (非常にポジティブ)
      emotion?: "frustrated" | "confused" | "satisfied" | "delighted" | "neutral";
    };
  };
  
  // resolve時の対応記録
  resolution?: {
    feedbackId: string;
    action: "instruction-updated" | "context-added" | "bug-reported" | "documented" | "no-action";
    description: string;
    changes?: string[];  // 行った変更のリスト
    preventionStrategy?: string;  // 今後の予防策
  };
  
  // delete時の指定
  id?: string;
}
```

**説明**:
- ユーザーの感情状態とフィードバックを体系的に記録
- 問題パターンを識別し、指示書への反映を提案
- 解決策と予防策を記録して、同様の問題の再発を防止
- 感情分析により緊急度を自動判定

**戻り値**:
```typescript
{
  success: boolean;
  action: string;
  
  feedbacks?: Array<{
    id: string;
    type: string;
    severity: string;
    category: string[];
    description: string;
    status: string;
    context: any;
    sentiment: any;
    createdAt: string;
    updatedAt: string;
    resolution?: any;
  }>;
  
  summary?: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    averageSentiment: number;
    trendingIssues: Array<{
      category: string;
      count: number;
      averageSeverity: string;
    }>;
    suggestedActions: Array<{
      priority: string;
      action: string;
      reason: string;
      affectedCategories: string[];
    }>;
  };
  
  errors?: string[];
}
```

---

## 3. データ構造

### 3.1 内部ストレージ構造

```typescript
{
  // メタ情報
  meta: {
    version: string;
    lastUpdated: string;
    projectId: string;
    projectName: string;
  };
  
  // プロジェクトコンテキスト
  contexts: {
    [id: string]: {
      id: string;
      category: string;
      title: string;
      description: string;
      priority: string;
      tags: string[];
      details: any;
      metadata: any;
    };
  };
  
  // 適応的指示の履歴
  adaptiveInstructions: {
    history: Array<{
      id: string;
      version: string;
      timestamp: string;
      scenario: string;
      instructions: string;
      rationale: string;
      active: boolean;
      expiresAt?: string;
    }>;
    current: string;  // 現在有効な指示のID
  };
  
  // ユーザーフィードバック
  feedbacks: {
    [id: string]: {
      id: string;
      type: string;
      severity: string;
      category: string[];
      description: string;
      status: string;
      context: any;
      sentiment: any;
      createdAt: string;
      updatedAt: string;
      resolution?: any;
    };
  };
  
  // 統計情報
  analytics: {
    totalEdits: number;
    lastAnalysis: string;
    effectivenessMetrics: {
      conventionCompliance: number;
      errorReduction: number;
      userSatisfaction: number;
    };
  };
}
```

### 3.2 指示書のメタデータ形式

`.github/copilot-instructions.md`の先頭にHTMLコメントとして埋め込む:

```markdown
<!--
MCP Copilot Instructions Metadata
Version: 1.0.0
Last Updated: 2025-12-01T10:30:00Z
Managed By: mcp-copilot-instructions-server
Active Contexts: ctx-001, ctx-003, ctx-007
Active Adaptive Instruction: adapt-123
-->

# Project Instructions

...
```

---

## 4. ワークフロー例

### 4.1 初回セットアップ

1. `guidance(topic: "getting-started")` - 使い方を確認
2. `project_context(action: "create", context: {...})` - プロジェクト情報を登録
3. `adaptive_instructions(action: "generate", generationContext: {...})` - 初期指示を生成
4. `adaptive_instructions(action: "apply", instructionId: "...")` - 指示を適用

### 4.2 日常的なメンテナンス

1. `adaptive_instructions(action: "analyze")` - 定期的に状況を分析
2. 問題が検出されたら:
   - `user_feedback(action: "create", feedback: {...})` - 問題を記録
   - `project_context(action: "update", context: {...})` - コンテキストを更新
   - `adaptive_instructions(action: "generate")` - 新しい指示を生成

### 4.3 トラブルシューティング

1. `user_feedback(action: "read", filter: {severity: "critical"})` - 重大な問題を確認
2. `adaptive_instructions(action: "analyze")` - 詳細分析
3. `instructions_structure(action: "read")` - 現在の指示書構造を確認
4. `instructions_structure(action: "update", element: {...})` - ピンポイントで修正
5. `user_feedback(action: "resolve", resolution: {...})` - 対応を記録

---

## 5. セキュリティとプライバシー

### 5.1 データの取り扱い

- **機密情報の除外**: APIキー、パスワード、個人情報は自動検出して記録から除外
- **ローカルストレージ**: すべてのデータはローカルに保存（`.mcp-copilot-instructions/`ディレクトリ）
- **バージョン管理**: 変更履歴は自動でバックアップ（最大30日分）

### 5.2 アクセス制御

- デフォルトでは読み取り専用モード
- 書き込み操作は明示的な確認が必要（設定で変更可能）
- 重要な変更は自動でgitコミット（オプション）

---

## 6. 拡張性

### 6.1 将来の機能候補

1. **チーム連携機能**
   - 複数開発者のフィードバックを統合
   - チーム全体の指示書テンプレート共有

2. **AI分析の高度化**
   - コードレビューコメントから自動的に規約を抽出
   - GitHubのIssue/PRと連携した自動更新

3. **パフォーマンスモニタリング**
   - Copilotの提案受入率の追跡
   - 指示の効果をリアルタイムで測定

4. **マルチプロジェクト対応**
   - 複数プロジェクト間での共通パターンの抽出
   - 組織レベルの標準指示テンプレート

---

## 7. 実装の優先順位

### Phase 1: MVP (Minimum Viable Product)
- `guidance` - 基本的なガイダンス
- `project_context` (create, read) - プロジェクト情報の登録と読み取り
- `instructions_structure` (read, update) - 基本的な構造操作

### Phase 2: Core Features
- `adaptive_instructions` (analyze, generate) - 動的な指示生成
- `user_feedback` (create, read) - フィードバック記録
- `project_context` (update, delete) - 完全なCRUD

### Phase 3: Advanced Features
- `adaptive_instructions` (apply, rollback) - 適用とロールバック
- `user_feedback` (resolve) - 問題解決の追跡
- `instructions_structure` (create, delete) - 完全なCRUD
- 統計とアナリティクス機能

---

## 8. まとめ

このMCPサーバは、3つの階層（ガイダンス、ローレベル、ハイレベル）で指示書を管理し、Copilotが常に最適なコンテキストで動作できるようにします。

**主な特徴**:
- ✅ シンプルなAPI（4つのメインツール）
- ✅ action引数によるCRUD統一
- ✅ 構造化されたデータ管理
- ✅ ユーザーフィードバックの体系的な記録
- ✅ 動的な指示書の適応
- ✅ 安全性とプライバシーの確保

次のステップは、この設計に基づいてMCPサーバの実装を開始することです。
