# プロダクトバックログ

**作成日**: 2025年12月1日  
**目的**: 将来実装すべき機能・改善点を優先度順に管理

---

## 凡例

- 🔴 Critical: システム安定性・データ整合性に関わる重要課題
- 🟠 High: 実用性に大きく影響する機能
- 🟡 Medium: UX改善・利便性向上
- 🟢 Low: Nice to have、将来的な拡張

---

## 🔴 Critical Priority

### PBI-001: 指示書の外部変更検知と競合管理

**カテゴリ**: File Management / Concurrency Control  
**優先度**: 🔴 Critical  
**登録日**: 2025年12月1日

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

**3. 競合解決フロー**
```
1. 書き込み前チェック
   ↓
2. 外部変更検知
   ↓
3. 差分表示（3-way merge view推奨）
   - ベース状態（MCPサーバの記憶）
   - 現在のファイル（外部変更後）
   - 適用しようとしている変更
   ↓
4. 人間開発者に判断を仰ぐ
   - オプション1: 外部変更を優先（MCP変更を破棄）
   - オプション2: MCP変更を優先（外部変更を上書き）
   - オプション3: マージを試行（conflict markers使用）
   - オプション4: 操作をキャンセル
```

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
      const {content, state} = await readWithState(INSTRUCTIONS_FILE);
      // ... AST操作 ...
      const result = await writeWithConflictCheck(INSTRUCTIONS_FILE, newContent, state);
      
      if (!result.success) {
        return formatConflictMessage(result.conflict);
      }
      return 'セクションを更新しました。';
    }
  }
}
```

#### 受け入れ基準

- [ ] ファイル読み取り時にハッシュ値を記録
- [ ] 書き込み前に外部変更を検知
- [ ] Git管理状態を自動判定
- [ ] 競合発生時に3-way diff表示
- [ ] 人間開発者に判断を促すUI（CLIでの選択肢表示）
- [ ] 競合解決後の再試行機能
- [ ] 自動バックアップ機能（`.copilot-instructions.backup/`）
- [ ] ユニットテスト（並行書き込みシミュレーション）

#### 関連課題

- PBI-002: ロールバック機能（変更履歴管理）
- PBI-003: 複数Copilotセッション間の排他制御

#### 備考

この機能は**Phase 2**で実装すべき。現在のMVPでは以下の前提で運用:
- Copilotが指示書を更新中は人間開発者が編集しない
- Git操作は指示書更新の前後で実施
- 問題が発生したら手動でgit revertで復旧

---

## 🟠 High Priority

### PBI-002: 変更履歴管理とロールバック機能

**カテゴリ**: Version Control / Safety  
**優先度**: 🟠 High  
**登録日**: 2025年12月1日

#### 概要

指示書の変更履歴を自動記録し、問題があればロールバック可能にする。

#### 要件

- すべての変更をタイムスタンプ付きで記録
- `.copilot-context/history/`に差分を保存
- `adaptive_instructions(action: "rollback")`でバージョン指定復元
- 最大保持期間: 30日（設定可能）

#### 受け入れ基準

- [ ] 変更時に自動でスナップショット作成
- [ ] ロールバック機能の実装
- [ ] 履歴一覧表示機能
- [ ] 差分表示機能

---

### PBI-003: 複数Copilotセッション間の排他制御

**カテゴリ**: Concurrency Control  
**優先度**: 🟠 High  
**登録日**: 2025年12月1日

#### 概要

複数のCopilotセッションが同時に指示書を更新する際の排他制御。

#### 要件

- ロックファイル（`.copilot-context/.lock`）による排他制御
- タイムアウト処理（5秒）
- デッドロック検知

---

## 🟡 Medium Priority

### PBI-004: user_feedback → developer_feedback への改名

**カテゴリ**: API Design / Terminology  
**優先度**: 🟡 Medium  
**登録日**: 2025年12月1日

#### 概要

用語の明確化のため、`user_feedback`を`developer_feedback`に改名し、Copilot自身の観察を記録する`copilot_observation`ツールを追加。

#### 要件

- `user_feedback` → `developer_feedback`
- `copilot_observation`ツール新設
- 既存データの移行スクリプト

---

### PBI-005: サマリー表示のカスタマイズ

**カテゴリ**: UX / Display  
**優先度**: 🟡 Medium  
**登録日**: 2025年12月1日

#### 概要

`project_context`の`format=summary`表示をカスタマイズ可能に。

#### 要件

- 表示フィールドの選択（tags, priority, category等）
- ソート順の指定（priority, createdAt, updatedAt）
- 件数制限（top N）

---

### PBI-006: instructions_structure のセクション削除機能

**カテゴリ**: Feature / CRUD  
**優先度**: 🟡 Medium  
**登録日**: 2025年12月1日

#### 概要

現在read/updateのみのため、delete/insertアクションを追加。

#### 要件

- `action: 'delete'`でセクション削除
- `action: 'insert'`で位置指定挿入（before/after/first-child/last-child）

---

## 🟢 Low Priority

### PBI-007: コンテキストのエクスポート機能

**カテゴリ**: Integration / Export  
**優先度**: 🟢 Low

#### 概要

`project_context`のデータをMarkdown/CSV/JSON形式でエクスポート。

---

### PBI-008: 統合テストとCI/CD

**カテゴリ**: Quality Assurance  
**優先度**: 🟢 Low

#### 概要

MCPツール群の統合テスト、GitHub Actions設定。

---

## 実装優先順位の推奨

1. **Phase 1 (完了)**: MVP - 基本CRUD、実プロジェクト活用
2. **Phase 2 (次期)**: 
   - 🔴 PBI-001: 外部変更検知（最優先）
   - 🟠 PBI-002: 変更履歴管理
   - 🟠 PBI-003: 排他制御
3. **Phase 3 (将来)**: 
   - 🟡 PBI-004〜006: UX改善、CRUD完成
4. **Phase 4 (拡張)**: 
   - 🟢 PBI-007〜008: エクスポート、テスト強化

---

## バックログ管理ルール

1. **追加**: 新しい課題はプロジェクトコンテキストにも登録（category: `product-backlog`）
2. **更新**: 優先度変更時は当ファイルとコンテキストの両方を更新
3. **完了**: 実装完了時は`implementation-scenarios.md`に移動
4. **レビュー**: 月1回、優先度と内容を見直し
