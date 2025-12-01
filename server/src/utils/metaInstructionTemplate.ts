/**
 * metaInstructionTemplate.ts
 * メタ指示セクションの生成ロジック
 * 
 * 責務:
 * - 開発状態に応じたメタ指示の生成
 * - ツール活用ガイドのテンプレート提供
 */

import { DevelopmentContext } from './generateInstructions';

/**
 * メタ指示セクションを生成
 * 
 * @param context 開発状態
 * @returns メタ指示のMarkdown文字列
 */
export function generateMetaInstruction(context: DevelopmentContext): string {
  const sections: string[] = [];
  
  // ヘッダー
  sections.push('## meta: ツール活用ガイド');
  sections.push('');
  sections.push('このMCPサーバは、指示書の外部記憶と動的生成を担います。以下のツールを適切に活用してください。');
  sections.push('');
  
  // 開発状態の管理
  sections.push('### 開発状態の管理');
  sections.push('');
  sections.push('開発フェーズや作業内容が変わる場合、必ず `change_context` ツールで状態を更新してください。');
  sections.push('');
  sections.push('**使用タイミング**:');
  sections.push('- フェーズ変更時（開発→テスト、テスト→デバッグ、など）');
  sections.push('- 作業フォーカスの変更時（API実装→認証実装、など）');
  sections.push('');
  sections.push('**効果**: 状態変更後、この指示書は自動的に再生成され、現在のフェーズに適した指示が優先されます。');
  sections.push('');
  
  // 開発ルールの登録
  sections.push('### 開発ルールの登録');
  sections.push('');
  sections.push('ユーザーから新しい規約・ルール・制約の指示を受けた場合、その場限りの対応ではなく、必ず `project_context` に永続化してください。');
  sections.push('');
  sections.push('**登録前の確認**:');
  sections.push('1. 既存ルールを検索（`project_context read`）');
  sections.push('2. 矛盾がないか確認');
  sections.push('3. 矛盾がある場合、ユーザーに確認を求める');
  sections.push('');
  sections.push('**重要**: 一度登録したルールは、以降すべてのセッションで参照されます。散逸を防ぐため、必ず登録してください。');
  sections.push('');
  
  // 指示書の自己認識
  sections.push('### 指示書の自己認識');
  sections.push('');
  sections.push('`instructions_structure` ツールは、**この指示書自体**を変更するツールです。使用時は、以下を明示してください。');
  sections.push('');
  sections.push('**注意事項**:');
  sections.push('- update/delete/insert実行時は、変更内容を明示');
  sections.push('- 「この指示書が変更されます」と警告');
  sections.push('- 外部変更がある場合、競合検出機能（`detect-conflicts`）が自動作動');
  sections.push('');
  
  // 既存ルールとの整合性確認
  sections.push('### 既存ルールとの整合性確認');
  sections.push('');
  sections.push('新しい指示を受けた際、既存の `project_context` と矛盾しないか必ず確認してください。');
  sections.push('');
  sections.push('**確認手順**:');
  sections.push('1. 関連カテゴリを検索（`project_context read`）');
  sections.push('2. 矛盾を検出した場合、ユーザーに選択肢を提示');
  sections.push('3. ユーザーの選択に従って、既存ルールを更新または維持');
  sections.push('');
  
  // 既存プロジェクトへの導入
  sections.push('### 既存プロジェクトへの導入');
  sections.push('');
  sections.push('初回実行時、または既存の `copilot-instructions.md` がある場合、`onboarding` ツールで分析してください。');
  sections.push('');
  sections.push('**動作**:');
  sections.push('- 互換性がある場合: 自動的に通常モードで動作');
  sections.push('- 互換性がない場合: 機能制限モードで動作（読み取り専用）');
  sections.push('- マイグレーション提案を確認後、承認を得て実行');
  
  return sections.join('\n');
}

/**
 * 開発状態に応じた追加メッセージを生成
 * 
 * @param context 開発状態
 * @returns 追加メッセージ（空の場合もある）
 */
export function generateContextSpecificGuidance(context: DevelopmentContext): string {
  const messages: string[] = [];
  
  // phase別の追加ガイダンス
  switch (context.phase) {
    case 'development':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**現在: 開発フェーズ**');
      messages.push('- 新しい規約は `project_context` に即座に登録');
      messages.push('- コーディング規約の参照を優先');
      break;
    case 'testing':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**現在: テストフェーズ**');
      messages.push('- テスト規約の参照を優先');
      messages.push('- カバレッジ目標を確認');
      break;
    case 'debugging':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**現在: デバッグフェーズ**');
      messages.push('- 既存 `project_context` の確認を優先');
      messages.push('- 問題の根本原因を記録');
      break;
    case 'refactoring':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**現在: リファクタリングフェーズ**');
      messages.push('- コード品質規約の参照を優先');
      messages.push('- 変更履歴を `change_context` で記録');
      break;
    case 'documentation':
      messages.push('');
      messages.push('---');
      messages.push('');
      messages.push('**現在: ドキュメント作成フェーズ**');
      messages.push('- ドキュメント規約の参照を優先');
      messages.push('- 重要な説明は `project_context` に登録');
      break;
  }
  
  // focus配列に応じた追加ガイダンス
  if (context.focus && context.focus.length > 0) {
    const focusGuidance: string[] = [];
    
    for (const item of context.focus) {
      const lowerItem = item.toLowerCase();
      
      if (lowerItem.includes('api')) {
        focusGuidance.push('- **API関連**: `project_context` でAPI規約を確認');
      }
      if (lowerItem.includes('認証') || lowerItem.includes('auth')) {
        focusGuidance.push('- **認証関連**: セキュリティ規約を最優先');
      }
      if (lowerItem.includes('データベース') || lowerItem.includes('db')) {
        focusGuidance.push('- **データベース関連**: スキーマ設計規約を確認');
      }
      if (lowerItem.includes('テスト') || lowerItem.includes('test')) {
        focusGuidance.push('- **テスト関連**: テストパターンとカバレッジ基準を確認');
      }
      if (lowerItem.includes('パフォーマンス') || lowerItem.includes('performance')) {
        focusGuidance.push('- **パフォーマンス関連**: 最適化ガイドラインを参照');
      }
    }
    
    if (focusGuidance.length > 0) {
      messages.push('');
      messages.push('**現在のフォーカス**:');
      messages.push(...focusGuidance);
    }
  }
  
  return messages.join('\n');
}

/**
 * 完全なメタ指示セクションを生成（基本 + 状態固有）
 * 
 * @param context 開発状態
 * @returns 完全なメタ指示のMarkdown文字列
 */
export function generateFullMetaInstruction(context: DevelopmentContext): string {
  const baseInstruction = generateMetaInstruction(context);
  const contextSpecificGuidance = generateContextSpecificGuidance(context);
  
  if (contextSpecificGuidance) {
    return `${baseInstruction}\n${contextSpecificGuidance}`;
  }
  
  return baseInstruction;
}
