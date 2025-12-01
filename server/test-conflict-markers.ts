/**
 * 競合マーカー方式のテストスクリプト
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  updateSection,
  detectConflictMarkers,
  resolveConflict,
  insertConflictMarkersManually,
} from './src/utils/markdownAst';

const TEST_FILE = path.resolve(__dirname, '../.github/copilot-instructions.md');

async function main() {
  console.log('=== 競合マーカー方式テスト ===\n');

  // バックアップ作成
  const originalContent = await fs.readFile(TEST_FILE, 'utf-8');

  try {
    // テスト1: セクション追加
    console.log('テスト1: テストセクション追加');
    
    await updateSection('テスト原則', 'これはテストセクションです。');
    console.log('  ✓ テストセクション追加完了\n');

    // テスト1b: 他セクション変更時の自動マージ
    console.log('テスト1b: 他セクション変更時の自動マージ');
    
    // 初期スナップショットを取得（Copilotが最初にファイルを読んだ時点をシミュレート）
    const initialSnapshot = await fs.readFile(TEST_FILE, 'utf-8');
    
    // 別のセクションを外部から変更（人間が編集をシミュレート）
    const modifiedContent = initialSnapshot.replace('## 用語の定義', '## 用語の定義\n\n<!-- 外部変更テスト -->');
    await fs.writeFile(TEST_FILE, modifiedContent, 'utf-8');
    console.log('  外部変更実行（用語の定義セクション）');
    
    // Copilotがupdatepectionを呼ぶ（初期スナップショットを渡す）
    const result1b = await updateSection(
      'テスト原則',
      'これはテストセクションです。\n更新版。',
      undefined, // expectedHash
      initialSnapshot // 初期スナップショット
    );
    
    if (result1b.autoMerged) {
      console.log('  ✓ 自動マージ成功\n');
    } else {
      console.log('  ✗ 自動マージ失敗（autoMergedフラグなし）\n');
    }

    // テスト2: 同一セクション変更時の競合マーカー挿入
    console.log('テスト2: 同一セクション変更時の競合検出');
    
    // 初期スナップショットを取得
    const initialSnapshot2 = await fs.readFile(TEST_FILE, 'utf-8');
    
    // 同じセクションを外部から変更
    const modifiedContent2 = initialSnapshot2.replace(
      'これはテストセクションです。\n更新版。',
      'これはテストセクションです。\n外部から変更。'
    );
    await fs.writeFile(TEST_FILE, modifiedContent2, 'utf-8');
    console.log('  外部変更実行（テスト原則セクション）');
    
    // 同じセクションを更新 → 競合マーカー挿入されるはず
    const result2 = await updateSection(
      'テスト原則',
      'これはテストセクションです。\nCopilotから変更。',
      undefined,
      initialSnapshot2
    );
    
    if (result2.conflict) {
      console.log('  ✓ 競合検出・マーカー挿入成功');
      console.log(`  ${result2.conflict}\n`);
    } else {
      console.log('  ✗ 競合検出失敗\n');
    }

    // テスト3: 競合検出
    console.log('テスト3: 競合検出');

    const conflicts = await detectConflictMarkers();
    if (conflicts.length > 0) {
      console.log(`  ✓ ${conflicts.length}件の競合を検出`);
      conflicts.forEach((c, i) => {
        console.log(`    ${i + 1}. セクション: ${c.heading}`);
        console.log(`       HEAD内容: ${c.headContent.substring(0, 30)}...`);
        console.log(`       MCP内容: ${c.mcpContent.substring(0, 30)}...`);
      });
      console.log();
    } else {
      console.log('  ✗ 競合検出失敗\n');
    }

    // テスト4: 競合解決（manual統合）
    console.log('テスト4: 競合解決（manual統合）');

    const resolveResult = await resolveConflict(
      'テスト原則',
      'manual',
      'これはテストセクションです。\n統合版（両方の変更を反映）。'
    );

    if (resolveResult.success) {
      console.log('  ✓ 競合解決成功\n');
    } else {
      console.log(`  ✗ 競合解決失敗: ${resolveResult.error}\n`);
    }

    // テスト5: 競合解決後の確認
    console.log('テスト5: 競合解決後の確認');

    const conflictsAfter = await detectConflictMarkers();
    if (conflictsAfter.length === 0) {
      console.log('  ✓ 競合が解決されました\n');
    } else {
      console.log(`  ✗ まだ${conflictsAfter.length}件の競合が残っています\n`);
    }

    // テスト6: use-head解決のテスト
    console.log('テスト6: use-head解決のテスト');

    // 競合を再作成
    const initialSnapshot3 = await fs.readFile(TEST_FILE, 'utf-8');
    const modifiedContent3 = initialSnapshot3.replace(
      'これはテストセクションです。\n統合版（両方の変更を反映）。',
      'これはテストセクションです。\n外部変更v2。'
    );
    await fs.writeFile(TEST_FILE, modifiedContent3, 'utf-8');
    console.log('  競合を再作成（外部変更v2）');

    const result6 = await updateSection(
      'テスト原則',
      'これはテストセクションです。\nCopilot変更v2。',
      undefined,
      initialSnapshot3
    );
    
    if (result6.conflict) {
      console.log('  ✓ 競合マーカー挿入成功');
      
      const resolveHeadResult = await resolveConflict('テスト原則', 'use-head');
      if (resolveHeadResult.success) {
        console.log('  ✓ use-head解決成功');
        
        // 内容を確認
        const finalContent = await fs.readFile(TEST_FILE, 'utf-8');
        const testSection = finalContent.match(/## テスト原則\n([\s\S]*?)(?=\n## |$)/);
        
        if (testSection) {
          const sectionContent = testSection[1].trim();
          console.log(`  解決後の内容: "${sectionContent}"`);
          
          if (sectionContent.includes('外部変更v2') && !sectionContent.includes('Copilot変更v2')) {
            console.log('  ✓ 外部変更(HEAD)が採用されました\n');
          } else {
            console.log('  ✗ 内容が期待と異なります\n');
          }
        } else {
          console.log('  ✗ テスト原則セクションが見つかりません\n');
        }
      } else {
        console.log(`  ✗ use-head解決失敗: ${resolveHeadResult.error}\n`);
      }
    } else {
      console.log('  ✗ 競合マーカー挿入失敗\n');
    }

  } finally {
    // 元に戻す
    await fs.writeFile(TEST_FILE, originalContent, 'utf-8');
    console.log('=== テスト完了（ファイルを元に戻しました） ===');
  }
}

main().catch(console.error);
