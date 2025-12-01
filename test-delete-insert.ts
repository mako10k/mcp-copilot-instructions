/**
 * test-delete-insert.ts
 * instructions_structure delete/insert機能の統合テスト
 * 
 * 実行方法: npx ts-node test-delete-insert.ts
 */

import { deleteSection, insertSection } from './server/src/utils/markdownAst.js';
import { readWithState } from './server/src/utils/fileSystem.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const INSTRUCTIONS_FILE = join(process.cwd(), '.github', 'copilot-instructions.md');

// テストデータの保存と復元
let originalContent: string = '';

async function backupFile(): Promise<void> {
  originalContent = await readFile(INSTRUCTIONS_FILE, 'utf-8');
  console.log('📁 元のファイルをバックアップしました\n');
}

async function restoreFile(): Promise<void> {
  await writeFile(INSTRUCTIONS_FILE, originalContent, 'utf-8');
  console.log('\n♻️  元のファイルに復元しました');
}

// テストヘルパー
function testResult(name: string, success: boolean, message?: string): void {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (message) console.log(`   ${message}`);
}

// テストシナリオ実装
async function testDeleteExisting(): Promise<void> {
  console.log('--- Scenario 1: 既存セクションの削除 ---');
  const result = await deleteSection('テストセクション');
  testResult('既存セクション削除', result.success);
}

async function testDeleteNonExistent(): Promise<void> {
  console.log('\n--- Scenario 2: 存在しないセクションの削除 ---');
  const result = await deleteSection('存在しないセクション999');
  testResult('存在しないセクション削除', !result.success && !!result.error?.includes('が見つかりません'));
}

async function testInsertFirst(): Promise<void> {
  console.log('\n--- Scenario 3: 先頭への挿入 ---');
  const result = await insertSection(
    'テスト: First Position',
    'このセクションは先頭に挿入されました。',
    'first'
  );
  testResult('先頭挿入', result.success);
}

async function testInsertLast(): Promise<void> {
  console.log('\n--- Scenario 4: 末尾への挿入 ---');
  const result = await insertSection(
    'テスト: Last Position',
    'このセクションは末尾に挿入されました。',
    'last'
  );
  testResult('末尾挿入', result.success);
}

async function testInsertBefore(): Promise<void> {
  console.log('\n--- Scenario 5: アンカーの前に挿入 ---');
  // まずアンカーを挿入
  await insertSection('テスト: Anchor Section', 'アンカーセクション', 'last');
  
  const result = await insertSection(
    'テスト: Before Anchor',
    'このセクションはアンカーの前に挿入されました。',
    'before',
    'テスト: Anchor Section'
  );
  testResult('アンカーの前に挿入', result.success);
}

async function testInsertAfter(): Promise<void> {
  console.log('\n--- Scenario 6: アンカーの後に挿入 ---');
  const result = await insertSection(
    'テスト: After Anchor',
    'このセクションはアンカーの後に挿入されました。',
    'after',
    'テスト: Anchor Section'
  );
  testResult('アンカーの後に挿入', result.success);
}

async function testInsertMissingAnchor(): Promise<void> {
  console.log('\n--- Scenario 7: 存在しないアンカーへの挿入 ---');
  const result = await insertSection(
    'テスト: Invalid Anchor',
    'このセクションは挿入に失敗するはず。',
    'before',
    '存在しないアンカー999'
  );
  testResult(
    '存在しないアンカー',
    !result.success && !!result.error?.includes('が見つかりません')
  );
}

async function testInsertDuplicate(): Promise<void> {
  console.log('\n--- Scenario 8: 重複セクションの挿入 ---');
  // まず挿入
  await insertSection('テスト: Duplicate', '最初の挿入', 'last');
  
  // 同じ見出しで再挿入を試みる
  const result = await insertSection('テスト: Duplicate', '重複の挿入', 'last');
  testResult(
    '重複挿入の防止',
    !result.success && !!result.error?.includes('既に存在します')
  );
}

async function testSequentialOperations(): Promise<void> {
  console.log('\n--- Scenario 9: 連続操作（挿入→削除） ---');
  
  // 挿入
  const insertResult = await insertSection(
    'テスト: Sequential',
    '連続操作テスト用セクション',
    'last'
  );
  testResult('挿入フェーズ', insertResult.success);
  
  // すぐに削除
  const deleteResult = await deleteSection('テスト: Sequential');
  testResult('削除フェーズ', deleteResult.success);
}

async function testContentVerification(): Promise<void> {
  console.log('\n--- Scenario 10: 挿入内容の検証 ---');
  
  const testContent = '改行を含む\n複数行の\n内容テスト。';
  await insertSection('テスト: Content Verify', testContent, 'last');
  
  const content = await readFile(INSTRUCTIONS_FILE);
  const hasContent = content.includes(testContent);
  testResult('複数行コンテンツ', hasContent, hasContent ? '内容が正しく挿入されました' : '内容が見つかりません');
}

// メインテスト実行
async function runTests(): Promise<void> {
  console.log('🧪 instructions_structure delete/insert 統合テスト\n');
  console.log('=' .repeat(50));
  
  try {
    await backupFile();
    
    // 全テストを順次実行
    await testInsertFirst();
    await testInsertLast();
    await testInsertBefore();
    await testInsertAfter();
    await testDeleteExisting();
    await testDeleteNonExistent();
    await testInsertMissingAnchor();
    await testInsertDuplicate();
    await testSequentialOperations();
    await testContentVerification();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 全テスト完了');
    
  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error);
  } finally {
    await restoreFile();
  }
}

// テスト実行
runTests().catch(console.error);
