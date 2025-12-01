# プロダクトバックログ

**作成日**: 2025年12月1日  
**最終更新**: 2025年12月1日

---

## 凡例

- 🔴 Critical: システム安定性・データ整合性に関わる重要課題
- 🟠 High: 実用性に大きく影響する機能
- 🟡 Medium: UX改善・利便性向上
- 🟢 Low: Nice to have、将来的な拡張

---

## エピック一覧

- **E1: 指示書外部記憶の基盤** ✅ (Phase 1完了)
- **E2: ローレベルAST編集** ✅ (Phase 1完了)
- **E3: ハイレベル文脈管理** ✅ (Phase 1完了)
- **E4: 適応的指示生成とロールバック** 🔄 (Phase 2計画中)
- **E5: フィードバックの記録と分析** 🔄 (Phase 2計画中)
- **E6: 運用オートメーション（CI/最適化）** 📋 (Phase 3以降)

---

## 完了済みストーリー (Phase 1)

### ✅ S1 (High): `.github/copilot-instructions.md`初期化と運用ポリシー記載
- **AC**: 週次レビュー方針が明記され、CIで検知される
- **完了日**: 2025年12月1日
- **関連**: Scenario 1, 用語定義追加

### ✅ S2 (High): `guidance`ツールのMVP
- **AC**: overview/getting-started/current-stateを返す
- **完了日**: 2025年12月1日
- **関連**: Scenario 1

### ✅ S3 (High): `project_context`のCRUD（create/read/update/delete）
- **AC**: カテゴリ/タグ/優先度でフィルタ可能、summary/full表示切替
- **完了日**: 2025年12月1日
- **関連**: Scenario 2, 4, 5
- **追加機能**: format=summary表示、action混入バグ修正

### ✅ S4 (High): `instructions_structure`のread/update
- **AC**: 見出し/段落/コード/リストの選択・編集が可能
- **完了日**: 2025年12月1日
- **関連**: Scenario 3, 5

### ✅ PBI-002 (High): 変更履歴管理とロールバック機能
- **AC**: 自動スナップショット作成、ロールバック、履歴一覧、差分表示
- **完了日**: 2025年12月1日
- **関連**: Scenario 9
- **実装内容**:
  - `.copilot-state/history/` に履歴を自動記録
  - `change_context` に4アクション追加（rollback/list-history/show-diff/cleanup-history）
  - タイムスタンプまたはインデックス指定でロールバック
  - 30日以上の古い履歴を自動削除

### ✅ PBI-004 (Medium): feedbackツールの設計
- **AC**: feedbackツール実装、criticalFeedback/copilotEssentialフラグ対応
- **完了日**: 2025年12月1日
- **関連**: Scenario 10
- **実装内容**:
  - `feedback` ツール実装（add/remove/list）
  - criticalFeedback（人間の強い指摘、+500点）
  - copilotEssential（LLMの重要判断、+300点）
  - フロントマター自動更新
  - スコアリングアルゴリズムとの自動連携

---

## 🔴 Critical Priority (Phase 2)

### PBI-001: 指示書の外部変更検知と競合管理

**カテゴリ**: File Management / Concurrency Control  
**優先度**: 🔴 Critical  
**登録日**: 2025年12月1日  
**エピック**: E4

#### 課題

指示書(`.github/copilot-instructions.md`)は以下の外部要因で予期せず変更される:
1. **人間開発者による直接編集**（エディタ、vim等）
2. **Git操作**（checkout、merge、rebase、pull等）
3. **他のツール**（フォーマッタ、リファクタリングツール等）
4. **複数のCopilotセッション**（並行実行時の競合）

現状の実装では、MCPサーバが想定する「ベース状態」と実ファイルの不一致を検知できず、以下のリスクがある:
- 外部変更を上書きしてしまう（データロス）
- 古い内容を基に更新して矛盾を生む
- Git管理下での競合を検知できない

#### 要件

**1. 変更検知メカニズム**
- ファイル読み取り時にハッシュ値（MD5/SHA-256）を記録
- 書き込み前に現在のハッシュと比較
- 不一致があれば「外部変更あり」として警告

**2. Git状態の考慮**
- `.git`ディレクトリの存在確認
- Git管理下の場合:
  - `git status`で未コミット変更を検知
  - `git diff`で変更内容を表示
  - コミットハッシュの記録
- 非Git管理下の場合:
  - タイムスタンプベースの変更検知
  - ローカルバックアップの自動作成

**3. 競合解決フロー(設計改訂版: 競合マーカー方式)**

**基本方針**:
- ❌ 強制上書き(force)は禁止 → データロスリスクを排除
- ✅ 競合マーカー付きで併記 → 情報を保持
- ✅ Copilot主体で解決 → LLMの理解力を活用

**フロー**:
```
1. updateSection実行
   ↓
2. セクション単位でハッシュ比較
   ↓
3a. 他セクションのみ変更 → 自動マージ成功 ✓
3b. 同一セクション変更 → 競合検知
   ↓
4. Git風の競合マーカーで併記:
   <<<<<<< HEAD (外部変更: timestamp)
   外部変更の内容
   =======
   Copilotの変更内容
   >>>>>>> MCP Update (Copilot)
   ↓
5. 次回read時、Copilotが競合マーカーを発見
   ↓
6. Copilotが内容を理解・判断:
   - 両方必要 → 統合
   - 片方で十分 → 選択
   - 人間に確認必要 → メッセージ
   ↓
7. action: 'resolve-conflict' で解決
```

**メリット**:
- データロスゼロ: 両方の変更が保持される
- Copilot主体: 次回読み込み時に自動的に気づく
- Git流のメンタルモデル: 開発者に馴染みがある

**4. 実装の提案**

```typescript
// fileSystem.ts に追加
interface FileState {
  path: string;
  hash: string;  // SHA-256
  timestamp: number;
  gitCommit?: string;  // Git管理下の場合
  isGitManaged: boolean;
}

async function readWithState(filePath: string): Promise<{content: string, state: FileState}> {
  const content = await fs.readFile(filePath, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const stats = await fs.stat(filePath);
  const isGitManaged = await checkGitManaged(filePath);
  
  return {
    content,
    state: {
      path: filePath,
      hash,
      timestamp: stats.mtimeMs,
      gitCommit: isGitManaged ? await getGitCommit(filePath) : undefined,
      isGitManaged,
    }
  };
}

async function writeWithConflictCheck(
  filePath: string, 
  content: string, 
  expectedState: FileState
): Promise<{success: boolean, conflict?: ConflictInfo}> {
  const current = await readWithState(filePath);
  
  if (current.state.hash !== expectedState.hash) {
    return {
      success: false,
      conflict: {
        base: expectedState,
        current: current.state,
        proposedContent: content,
        diff: await computeDiff(expectedState, current.state)
      }
    };
  }
  
  await fs.writeFile(filePath, content, 'utf-8');
  return {success: true};
}
```

**5. instructions_structure への統合**

```typescript
// instructions_structure.ts
export async function instructionsStructure(args: InstructionsStructureArgs) {
  switch (args.action) {
    case 'update': {
      const result = await updateSectionWithMerge(args.heading, args.content);
      
      if (result.conflict) {
        return `⚠️ 競合を検知しました。競合マーカーを追加しました。\n` +
               `次回読み込み時に内容を確認して解決してください。`;
      }
      return 'セクションを更新しました。';
    }
    
    case 'resolve-conflict': {
      // 競合解決専用アクション
      const result = await resolveConflict(
        args.heading,
        args.resolution,  // 'use-head' | 'use-mcp' | 'manual'
        args.manualContent
      );
      return result.success 
        ? '競合を解決しました。' 
        : `エラー: ${result.error}`;
    }
    
    case 'detect-conflicts': {
      // 競合マーカーの検出
      const conflicts = await detectConflictMarkers();
      if (conflicts.length === 0) {
        return '競合はありません。';
      }
      return `${conflicts.length}件の競合を検出しました:\n` +
             conflicts.map(c => `- ${c.heading}`).join('\n');
    }
  }
}
```

#### 受け入れ基準

**Step 1: 基本的な競合検知** ✅ (完了)
- [x] ファイル読み取り時にハッシュ値を記録
- [x] 書き込み前に外部変更を検知
- [x] 競合時にエラーメッセージ表示

**Step 1.5: 競合マーカー方式** ✅ (完了 2025-12-01)
- [x] セクション単位のハッシュ比較
- [x] 他セクション変更時の自動マージ
- [x] 同一セクション変更時の競合マーカー挿入
- [x] `action: 'detect-conflicts'` 実装
- [x] `action: 'resolve-conflict'` 実装(3パターン対応: use-head/use-mcp/manual)
- [x] 競合解決のテストシナリオ（全6テスト成功）
- [x] テキストベース処理で競合マーカー保持（Markdownパーサー回避）
- [x] 初期スナップショット機能で外部変更検出

**Step 2: Git統合** ✅ (完了 2025-12-01)
- [x] Git管理状態を自動判定 (checkGitManaged)
- [x] `git status`で未コミット変更を検知 (getGitStatus)
- [x] `git diff`で変更内容を表示 (getGitDiff)
- [x] コミットハッシュ取得 (getGitCommit)
- [x] FileState型にGit情報追加
- [x] readWithState関数のGit対応
- [x] instructions_structureにGit情報表示機能
- [x] テストスクリプト作成と検証

**Step 3: 高度な機能** (Phase 3)
- [ ] 3-way diff表示
- [ ] 自動バックアップ機能(`.copilot-instructions.backup/`)
- [ ] 複数Copilotセッション間の排他制御

#### 関連課題

- PBI-002: ロールバック機能（変更履歴管理）
- PBI-003: 複数Copilotセッション間の排他制御

#### 実装履歴

**2025年12月1日 - Step 1完了**
- SHA-256ハッシュによる基本的な競合検知
- `readWithState` / `writeWithConflictCheck` 実装
- テスト4シナリオすべてパス

**課題: 手詰まり問題の発見**
```
1. Copilot: 指示書を読み込み (hash: ABC)
2. 人間: 指示書を編集 (hash: DEF) 
3. Copilot: 更新試行 → 競合エラー
4. Copilot: 再試行 → 同じエラー(古いhashを持っている)
5. 🔴 手詰まり
```

**解決策: 競合マーカー方式(次期実装)**
- 競合時も書き込み成功(マーカー付き)
- 次回read時にCopilotが自動検知
- Copilot主体で解決、必要時のみ人間に確認

### ✅ PBI-003 (High): 複数Copilotセッション間の排他制御
- **AC**: ロックファイルによる排他制御、タイムアウト処理、デッドロック検知
- **完了日**: 2025年12月1日
- **関連**: Scenario 12
- **実装内容**:
  - `lockManager.ts` 作成（acquireLock/releaseLock/withLock/getLockStatus）
  - `.copilot-state/.lock` でセッション間排他制御
  - タイムアウト: 5秒、古いロック自動削除: 10秒
  - `instructions_structure` の update/resolve-conflict に統合
  - withLock パターンで確実に解放
  - テスト6シナリオすべて成功
  - ユーザーフレンドリーなエラーメッセージ

---

## 🎉 Phase 2 完了

**Phase 2の目標**: 安定性・並行制御・履歴管理

**完了項目**:
1. ✅ PBI-001: 外部変更検知と競合解決（Step 1, 1.5, 2）
2. ✅ PBI-002: 変更履歴管理とロールバック
3. ✅ 動的指示書生成エンジン
4. ✅ PBI-004: feedbackツール + ソフト・ハードリミット
5. ✅ PBI-003: 複数Copilotセッション間の排他制御

**達成内容**:
- ✅ 安定性: 外部変更検知、競合マーカー方式、Git統合
- ✅ 並行制御: ロックファイルによる排他制御、デッドロック防止
- ✅ 履歴管理: 自動スナップショット、ロールバック、差分表示、古い履歴削除
- ✅ 動的生成: phase/focus/priority による適応的指示抽出
- ✅ 優先度管理: ソフト・ハードリミットでアテンション分散防止

---

## 🟡 Medium Priority (Phase 3)

### PBI-005: サマリー表示のカスタマイズ

**カテゴリ**: UX / Display  
**優先度**: 🟡 Medium  
**登録日**: 2025年12月1日  
**エピック**: E3

#### 概要

`project_context`の`format=summary`表示をカスタマイズ可能に。

#### 要件

- 表示フィールドの選択（tags, priority, category等）
- ソート順の指定（priority, createdAt, updatedAt）
- 件数制限（top N）

---

### PBI-006: instructions_structure のセクション削除・挿入機能 ✅

**カテゴリ**: Feature / CRUD  
**優先度**: 🟡 Medium → ✅ 完了  
**登録日**: 2025年12月1日  
**完了日**: 2025年12月1日  
**エピック**: E2  
**関連ストーリー**: S4  
**参照**: [Scenario 13](../implementation-scenarios.md#scenario-13-instructions_structure-crud完成deleteinse実装---pbi-006)

#### 概要

instructions_structureツールにCRUD操作の残り2つ（Create/Delete）を追加し、完全な指示書管理機能を実現。

#### 実装内容

**markdownAst.ts**:
- ✅ `deleteSection(heading)`: セクション削除（~35行）
- ✅ `insertSection(heading, content, position, anchor?)`: セクション挿入（~105行）
  - 4つの位置: first（先頭）、last（末尾）、before（アンカー前）、after（アンカー後）

**instructions_structure.ts**:
- ✅ deleteアクション実装（withLock統合）
- ✅ insertアクション実装（withLock統合）
- ✅ 日本語メッセージ（先頭に/最後に/「X」の前に/後に）

**index.ts**:
- ✅ MCPスキーマ更新（delete/insert追加）
- ✅ position/anchorプロパティ追加

**テスト**:
- ✅ test-delete-insert.ts（10シナリオすべて成功）
- ✅ 正常系: 先頭/末尾/before/after挿入、削除、連続操作
- ✅ 異常系: 存在しないセクション、重複、存在しないアンカー

#### 成果

- **CRUD完成**: Create(insert) / Read / Update / Delete すべて実装
- **柔軟性**: 4つの挿入位置で論理的な構成管理
- **安全性**: 重複防止、存在確認、排他制御統合
- **品質**: 10/10テスト成功、エラーハンドリング完備

#### 技術的価値

- テキストベース処理でシンプルかつ効率的
- withLockパターンで並行処理の安全性確保
- 動的な指示書構成変更が可能に
- Phase 3の第一歩として基盤完成

---

### PBI-009: 既存プロジェクトへの安全な導入（onboardingツール）

**カテゴリ**: Feature / Onboarding  
**優先度**: 🔴 Critical  
**登録日**: 2025年12月1日  
**エピック**: E2  
**関連ストーリー**: S4  
**参照**: [Scenario 14](../implementation-scenarios.md#scenario-14-既存プロジェクトへの安全な導入とマイグレーション)

#### 概要

既存プロジェクトにMCPサーバを導入する際の安全性を確保。既存の `copilot-instructions.md` のエッセンスを壊さず、ユーザーの明示的な承認を得ながら移行を進める。承認が得られない場合は機能制限モードで動作。

#### 背景・課題

**実際の導入で直面する問題**:
- 既存の指示書が様々な形式・品質状態で存在
- 勝手に変更するとユーザーの意図を損なう
- 矛盾や重複がある場合、自動判断は危険
- 承認なしで変更してはいけない

**4つの導入パターン**:
1. **クリーン**: 指示書なし（現在サポート済み）
2. **構造化済み**: `## セクション` 形式（互換性あり）
3. **非構造化**: フリーフォーマット（マイグレーション必要）
4. **めちゃくちゃ**: 矛盾・重複あり（クリーンアップ必要）

#### 実装内容

**Phase A: 検出と分析** 🔴 Critical
- 新ツール `onboarding` 作成
- `analyze` アクション: 既存指示書の分析と分類
  - 4パターンの判定（clean/structured/unstructured/messy）
  - 問題検出（矛盾/重複/不明瞭）
  - 推奨アクションの提示
- 初回実行時の自動分析

**Phase B: マイグレーション提案** 🟡 High
- `propose` アクション: マイグレーション計画の生成
  - プレビュー表示（変更前後の比較）
  - リスク評価（low/medium/high）
  - セクション構造の提案
- ユーザーインタラクティブな承認フロー

**Phase C: 安全な実行** 🟡 High
- `approve` アクション: ユーザー承認の記録
- `migrate` アクション: マイグレーション実行
  - バックアップ作成（`.backup` + タイムスタンプ）
  - アトミック操作（失敗時は自動ロールバック）
  - 実行後の検証プロンプト
- `rollback` アクション: 24時間以内のロールバック
- `status` アクション: オンボーディング状態確認

**Phase D: 機能制限モード** 🔴 Critical
- オンボーディング状態の永続化（`.copilot-state/onboarding-status.json`）
- 承認が得られない場合の動作:
  - ✅ 使用可能: guidance, instructions_structure:read, project_context, feedback
  - ❌ 制限: instructions_structure:update/delete/insert, change_context
- 制限モード時の明確なメッセージ
- 承認後の通常モード移行

#### ユーザーエクスペリエンス

**シナリオA: 非構造化指示書**
```
Copilot: 「既存の指示書を検出。構造化の提案を確認しますか？」
User: "はい"
Copilot: 「【提案する構造】... この変更を適用しますか？」
User: "適用してください"
Copilot: 「✓ バックアップ作成、マイグレーション完了」
```

**シナリオB: めちゃくちゃな状態**
```
Copilot: 「⚠️ 矛盾検出: anyは禁止 vs anyOK
         手動での整理をお勧めします。
         読み取り専用モードで動作します。」
User: (手動で整理)
Copilot: 「✓ 問題解決。通常モードで動作します。」
```

**シナリオC: 承認拒否**
```
User: "マイグレーション拒否"
Copilot: 「読み取り専用モードで動作します。
         いつでも再検討できます。」
```

#### AC（受け入れ基準）

**Phase A**: ✅ **完了 (2025-12-01)**
- [x] 既存指示書の存在確認
- [x] 4パターンの分類ロジック
- [x] 問題検出（矛盾/重複）
- [x] 推奨アクションの提示
- [x] 初回実行時の自動分析

**Phase A 実装ファイル**:
- `server/src/utils/onboardingStatusManager.ts` (170行) - 状態管理
- `server/src/utils/instructionsAnalyzer.ts` (367行) - 4パターン分析ロジック
- `server/src/tools/onboarding.ts` (280行) - MCPツール実装
- `server/test-onboarding-phase-a.ts` (410行) - 7シナリオテスト

**Phase A テスト結果**:
- ✅ Test 1: Pattern 1 (clean) → 自動完了、通常モード
- ✅ Test 2: Pattern 2 (structured) → 自動完了、通常モード
- ✅ Test 3: Pattern 3 (unstructured) → 制限モード、セクション提案
- ✅ Test 4: Pattern 4 (messy) → 制限モード、問題検出（矛盾4件）
- ✅ Test 5: 制限モード update blocked
- ✅ Test 6: 制限モード read allowed
- ✅ Test 7: guidance shows status

**Phase B**:
- [ ] マイグレーション計画の生成
- [ ] プレビュー表示（変更前後）
- [ ] リスク評価（3段階）
- [ ] ユーザー承認のUI

**Phase C**:
- [ ] バックアップ作成（タイムスタンプ付き）
- [ ] アトミックなマイグレーション
- [ ] ロールバック機能（24時間保証）
- [ ] 実行後の検証プロンプト

**Phase D**: ✅ **完了 (2025-12-01)**
- [x] オンボーディング状態の永続化
- [x] ツールごとのアクセス制御
- [x] 制限モード時のメッセージ
- [x] 承認後の通常モード移行

**Phase D 実装ファイル**:
- `server/src/tools/instructions_structure.ts` - update/delete/insert/resolve-conflict に制限チェック
- `server/src/tools/change_context.ts` - update/reset/rollback に制限チェック
- `server/src/tools/guidance.ts` - current-state にオンボーディング状態表示
- `server/src/index.ts` - onboarding ツール登録

#### 技術的価値

- **信頼性**: 既存のエッセンスを壊さない
- **安全性**: 明示的な承認フロー
- **柔軟性**: 機能制限モードで段階的導入
- **復元性**: いつでもロールバック可能

#### 依存関係

- 既存: instructions_structure, guidance
- 新規: onboarding ツール
- 状態管理: `.copilot-state/onboarding-status.json`

#### 実装規模見積もり

- Phase A: ~~150行~~ **597行** (onboardingStatusManager 170 + instructionsAnalyzer 367 + onboarding 280 - 既存コード共有)
- Phase B: 200行（提案生成）← 未実装
- Phase C: 100行（マイグレーション実行）← 未実装
- Phase D: ~~100行~~ **約80行** (instructions_structure 15 + change_context 20 + guidance 45 + index 20 - 差分のみカウント)
- テスト: ~~200行~~ **410行** (test-onboarding-phase-a.ts)
- **合計**: 約1087行（Phase A+D完了、Phase B+C未実装）

---

### PBI-010: 生成指示書への基本ガイダンス埋め込み（Meta-instruction）

**カテゴリ**: Feature / Meta-instruction  
**優先度**: 🟠 High  
**登録日**: 2025年12月1日  
**エピック**: E4  
**関連ストーリー**: S4, PBI-002, PBI-009

#### 概要

MCPサーバが生成・管理する `.github/copilot-instructions.md` に、Copilot自身がこのツール群を活用するための「メタ指示」を自動的に埋め込む。これにより、Copilotが開発状態の変更や開発ルールの登録を適切に実行できるようになる。

#### 背景・課題

**現状の問題**:
- 生成された指示書には、プロジェクト固有の規約は含まれるが、「ツールの使い方」が書かれていない
- Copilotが開発状態（phase/focus）を変更すべき場面で、change_contextツールを使わない
- ユーザーが新しい開発ルールを指示しても、project_contextに登録せず、その場限りの対応になる
- Copilotが指示書を変更するツール（instructions_structure）を使うと、この指示書自体が書き換わることの自覚がない

**求められる動作**:
1. **開発状態の管理**: フェーズが変わる（開発→テスト）場合、change_contextで状態を更新
2. **開発ルールの登録**: ユーザーから新しい規約を指示された場合、project_contextに永続化
3. **指示書の自己認識**: instructions_structureを使うと、この指示書が変更されることを理解
4. **既存ルールの照合**: 新しい指示が既存のproject_contextと矛盾しないか確認

#### 実装内容

**Phase A: メタ指示セクションの設計** 🟠 High
- 新セクション `## meta: ツール活用ガイド` の構造設計
- 含めるべき内容:
  1. **開発状態管理**: change_contextツールの使用タイミング
  2. **開発ルール登録**: project_contextへの新規登録フロー
  3. **既存ルール照合**: 新指示と既存contextの整合性チェック
  4. **指示書の自己認識**: instructions_structureが自身を変更することの明示
  5. **オンボーディング**: 既存プロジェクトでのonboardingツール活用
- トーン: 簡潔かつ実行可能な指示形式

**Phase B: generateInstructions への統合** 🟠 High
- `generateInstructions()` 関数の拡張
- メタ指示セクションの自動挿入（先頭または末尾）
- 既存セクションとの位置関係の最適化
- change_context実行時の自動反映

**Phase C: 動的な指示調整** 🟡 Medium
- 開発状態（phase）に応じたメタ指示の強調
  - development: project_context活用を強調
  - testing: テスト規約の参照を強調
  - debugging: 既存contextの確認を強調
- focus配列に応じた関連ツールの提示

**Phase D: テストとバリデーション** 🟡 Medium
- メタ指示が含まれた指示書での動作確認
- Copilotが実際にツールを使用するかの検証
- 不要な冗長性の排除

#### ユーザーエクスペリエンス

**シナリオA: 開発フェーズの変更**
```
User: "実装が完了したので、テストフェーズに入ります"
Copilot: (change_contextを使用)
         "開発状態を更新しました。phase: testing に変更。
          テスト関連の指示を優先します。"
```

**シナリオB: 新しい開発ルールの指示**
```
User: "今後、すべてのAPI関数にはZodスキーマ検証を必須にしてください"
Copilot: (project_contextで既存ルール確認)
         "既存のバリデーションルールを確認...
          新しいルールを登録します。"
         (project_context createを実行)
         "✓ 登録完了。今後このルールを適用します。"
```

**シナリオC: 指示書変更の自覚**
```
User: "TypeScript規約のセクションを更新してください"
Copilot: "instructions_structureで更新します。
         注意: この操作により、この指示書自体が変更されます。
         外部変更検知機能で競合を検出します。"
```

#### メタ指示の例（draft）

```markdown
## meta: ツール活用ガイド

このMCPサーバは、指示書の外部記憶と動的生成を担います。以下のツールを適切に活用してください。

### 開発状態の管理
- フェーズ変更時は `change_context` で状態を更新
  - 例: 開発→テスト、デバッグ→リファクタリング
- focus配列で現在の作業内容を記録
- 状態変更後、指示書は自動再生成されます

### 開発ルールの登録
- ユーザーからの新しい規約・ルールは `project_context` に永続化
- 登録前に既存ルールとの整合性を確認（`project_context read`）
- 矛盾がある場合は、ユーザーに確認を求める

### 指示書の自己認識
- `instructions_structure` は **この指示書自体** を変更するツール
- update/delete/insert実行時は、変更内容を明示
- 外部変更がある場合、競合検出機能が作動（`detect-conflicts`）

### 既存プロジェクトへの導入
- 初回実行時は `onboarding` で既存指示書を分析
- 互換性がない場合、機能制限モードで動作
- マイグレーション提案を確認後、承認を得て実行
```

#### AC（受け入れ基準）

**Phase A**:
- [ ] メタ指示セクションの内容定義
- [ ] トーンとスタイルの確定
- [ ] 必要な指示項目の網羅性確認

**Phase B**:
- [ ] generateInstructions() へのメタ指示挿入実装
- [ ] セクション位置の最適化
- [ ] change_context実行時の自動反映

**Phase C**:
- [ ] phase別の動的調整実装
- [ ] focus配列に応じた指示強調
- [ ] 冗長性の排除

**Phase D**:
- [ ] Copilotによるツール使用の実証
- [ ] 指示書の可読性確認
- [ ] パフォーマンスへの影響測定

#### 技術的価値

- **自律性向上**: Copilotが自発的にツールを活用
- **一貫性**: 開発ルールが散逸せず、永続化される
- **透明性**: 指示書変更の影響範囲を明示
- **効率性**: ユーザーが毎回指示しなくても適切な動作

#### 依存関係

- 既存: generateInstructions, change_context, project_context, instructions_structure
- 新規: メタ指示セクションのテンプレート
- 影響: 生成される全ての指示書にメタ指示が含まれる

#### 実装規模見積もり

- Phase A: 設計・ドラフト作成（20行程度のメタ指示）
- Phase B: generateInstructions拡張（50行）
- Phase C: 動的調整ロジック（80行）
- Phase D: テスト・検証（100行）
- **合計**: 約250行 + メタ指示テンプレート

---

### S6 (Med): `adaptive_instructions`のanalyze/generate

**カテゴリ**: Feature / Adaptive  
**優先度**: 🟡 Medium  
**エピック**: E4

#### 概要

コードベースやCopilotパフォーマンスを分析し、指示を動的に生成。

#### AC
- 規約順守スコア・改善提案を返す
- シナリオに応じた一時的指示を生成

---

### S8 (Med): 指示書最適化ルールの適用

**カテゴリ**: Feature / Optimization  
**優先度**: 🟡 Medium  
**エピック**: E6

#### 概要

使用頻度の低いセクションを分離し、参照として追加。

#### AC
- 使用頻度低セクションの分離と参照追加

---

## 🟢 Low Priority (Phase 4)

### PBI-007: コンテキストのエクスポート機能

**カテゴリ**: Integration / Export  
**優先度**: 🟢 Low  
**エピック**: E3

#### 概要

`project_context`のデータをMarkdown/CSV/JSON形式でエクスポート。

---

### PBI-008: 統合テストとCI/CD

**カテゴリ**: Quality Assurance  
**優先度**: 🟢 Low  
**エピック**: E6

#### 概要

MCPツール群の統合テスト、GitHub Actions設定。

---

## 非機能要件

### セキュリティ
- 機密情報自動除外（APIキー、パスワード、個人情報）
- すべてのデータはローカル保存（`.mcp-copilot-instructions/`）
- Git管理から除外（`.gitignore`設定済み）

### 可用性
- 失敗時の自動ロールバック
- 変更履歴保持（最大30日）
- エラー時の詳細メッセージ

### パフォーマンス
- 分析処理: 10秒以内に完了
- ファイル読み書き: 1秒以内
- MCPツール応答: 3秒以内

---

## 実装フェーズ

### Phase 1 (完了) ✅
**期間**: 2025年12月1日  
**目標**: MVP - 基本CRUD、実プロジェクト活用

**完了項目**:
- ✅ guidance (Scenario 1)
- ✅ project_context CRUD (Scenario 2, 4)
- ✅ instructions_structure read/update (Scenario 3)
- ✅ 実プロジェクト活用とUX改善 (Scenario 5)
- ✅ 用語定義の明確化

### Phase 2 (完了) ✅
**期間**: 2025年12月1日  
**目標**: 安定性・並行制御・履歴管理

**完了項目**:
1. ✅ PBI-001: 外部変更検知と競合解決（Step 1, 1.5, 2完了）
2. ✅ PBI-002: 変更履歴管理とロールバック
3. ✅ 動的指示書生成エンジン
4. ✅ PBI-004: feedbackツール + ソフト・ハードリミット
5. ✅ PBI-003: 複数Copilotセッション間の排他制御

**達成内容**:
- ✅ 安定性: 外部変更検知、競合マーカー方式、Git統合
- ✅ 並行制御: ロックファイルによる排他制御、デッドロック防止
- ✅ 履歴管理: 自動スナップショット、ロールバック、差分表示
- ✅ 動的生成: phase/focus/priority による適応的指示抽出
- ✅ 優先度管理: ソフト・ハードリミットでアテンション分散防止

### Phase 3 (進行中) 🎯
**期間**: 2025年12月1日〜  
**目標**: UX改善、CRUD完成、運用機能強化

**完了項目**:
1. ✅ **PBI-006**: instructions_structure delete/insert（CRUD完成）
   - Scenario 13で完了
   - deleteSection/insertSection実装
   - 4つの挿入位置（first/last/before/after）
   - 10/10テスト成功

2. ✅ **PBI-009**: onboardingツール（既存プロジェクトへの安全な導入）← Phase A+D完了
   - ✅ Phase A: 検出と分析（完了 2025-12-01）
   - ✅ Phase D: 機能制限モード（完了 2025-12-01）
   - 🟡 Phase B: マイグレーション提案（未実装）
   - 🟡 Phase C: 安全な実行（未実装）
   - 実装: 1087行（utils 2ファイル、tools 3ファイル修正、test 1ファイル）
   - テスト: 7/7成功

**残りの推奨実装**:
3. 🟠 **PBI-010**: 生成指示書への基本ガイダンス埋め込み（Meta-instruction）← NEW
   - ツールの使用方法の明記
   - 開発状態管理の自覚
   - 開発ルール登録フロー
4. 🟡 **PBI-005**: サマリーカスタマイズ（UX改善）
5. 🟡 **feedback拡張**: suggest-merge機能（Phase 2の延長）
6. 🟡 **S8**: 指示書最適化ルール適用
7. 🟡 **S6**: adaptive_instructions（高度な機能）

### Phase 4 (拡張) 🚀
**目標**: エクスポート、テスト強化、CI/CD

**対象項目**:
- 🟢 PBI-007: エクスポート機能
- 🟢 PBI-008: 統合テスト・CI/CD

---

## バックログ管理ルール

1. **追加**: 新しい課題はプロジェクトコンテキストにも登録（category: `product-backlog`）
2. **更新**: 優先度変更時は当ファイルとコンテキストの両方を更新
3. **完了**: 実装完了時は`implementation-scenarios.md`に移動し、当ファイルの完了済みセクションに記録
4. **レビュー**: 月1回、優先度と内容を見直し
