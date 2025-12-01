#!/usr/bin/env tsx
/**
 * PBI-009 Phase A+D テストスクリプト
 * 
 * 7つのシナリオをテスト:
 * 1. Pattern 1 (clean): ファイルなし → analyze → 自動完了
 * 2. Pattern 2 (structured): ## sections → analyze → 自動完了
 * 3. Pattern 3 (unstructured): 自由形式 → analyze → 制限モード
 * 4. Pattern 4 (messy): 問題あり → analyze → 制限モード + 問題検出
 * 5. 制限モード (update blocked): restrictedMode=true → update → エラー
 * 6. 制限モード (read allowed): restrictedMode=true → read → 成功
 * 7. guidance shows status: analyze → guidance current-state → オンボーディング情報表示
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { onboarding } from './src/tools/onboarding';
import { instructionsStructure } from './src/tools/instructions_structure';
import { guidance } from './src/tools/guidance';
import { 
  getOnboardingStatus, 
  saveOnboardingStatus 
} from './src/utils/onboardingStatusManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '../');
const INSTRUCTIONS_PATH = path.join(WORKSPACE_ROOT, '.github/copilot-instructions.md');
const STATE_PATH = path.join(WORKSPACE_ROOT, '.copilot-state/onboarding.json');

// テストヘルパー
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    testCount++;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test ${testCount}: ${name}`);
    console.log('='.repeat(80));
    try {
      await fn();
      passCount++;
      console.log(`✓ PASS`);
    } catch (error) {
      failCount++;
      console.error(`✗ FAIL: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// セットアップ・クリーンアップ
async function setup() {
  console.log('Setup: バックアップと初期化');
  
  // 既存ファイルのバックアップ
  try {
    const content = await fs.readFile(INSTRUCTIONS_PATH, 'utf-8');
    await fs.writeFile(`${INSTRUCTIONS_PATH}.backup`, content, 'utf-8');
    console.log('  - 既存の .github/copilot-instructions.md をバックアップ');
  } catch {
    console.log('  - .github/copilot-instructions.md は存在しない（新規）');
  }
  
  try {
    const state = await fs.readFile(STATE_PATH, 'utf-8');
    await fs.writeFile(`${STATE_PATH}.backup`, state, 'utf-8');
    console.log('  - 既存の .copilot-state/onboarding.json をバックアップ');
  } catch {
    console.log('  - .copilot-state/onboarding.json は存在しない（新規）');
  }
}

async function cleanup() {
  console.log('\nCleanup: バックアップの復元');
  
  // バックアップから復元
  try {
    const content = await fs.readFile(`${INSTRUCTIONS_PATH}.backup`, 'utf-8');
    await fs.writeFile(INSTRUCTIONS_PATH, content, 'utf-8');
    await fs.unlink(`${INSTRUCTIONS_PATH}.backup`);
    console.log('  - .github/copilot-instructions.md を復元');
  } catch {
    try {
      await fs.unlink(INSTRUCTIONS_PATH);
      console.log('  - .github/copilot-instructions.md を削除（元々なし）');
    } catch {}
  }
  
  try {
    const state = await fs.readFile(`${STATE_PATH}.backup`, 'utf-8');
    await fs.writeFile(STATE_PATH, state, 'utf-8');
    await fs.unlink(`${STATE_PATH}.backup`);
    console.log('  - .copilot-state/onboarding.json を復元');
  } catch {
    try {
      await fs.unlink(STATE_PATH);
      console.log('  - .copilot-state/onboarding.json を削除（元々なし）');
    } catch {}
  }
}

async function resetState() {
  console.log('  → 状態をリセット');
  try {
    await fs.unlink(INSTRUCTIONS_PATH);
  } catch {}
  try {
    await fs.unlink(STATE_PATH);
  } catch {}
}

// テストケース
const test1 = test('Pattern 1 (clean): ファイルなし → analyze → 自動完了', async () => {
  await resetState();
  
  // ファイルが存在しないことを確認
  try {
    await fs.access(INSTRUCTIONS_PATH);
    throw new Error('Instructions file should not exist');
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
  
  // analyze実行
  const result = await onboarding({ action: 'analyze' });
  console.log('\n--- analyze結果 ---');
  console.log(result);
  
  // 状態確認
  const status = await getOnboardingStatus();
  console.log('\n--- 状態 ---');
  console.log(JSON.stringify(status, null, 2));
  
  assert(status.pattern === 'clean', 'pattern should be clean');
  assert(status.status === 'completed', 'status should be completed (auto-completed)');
  assert(status.restrictedMode === false, 'restrictedMode should be false');
  assert(result.includes('新規作成できます'), 'result should mention creating new file');
  assert(result.includes('通常モード'), 'result should mention normal mode');
});

const test2 = test('Pattern 2 (structured): ## sections → analyze → 自動完了', async () => {
  await resetState();
  
  // 構造化された指示書を作成
  const structuredContent = `# Copilot Instructions

## conventions: TypeScript規約

- すべて型付け
- anyは禁止

## patterns: テストパターン

- Jest使用
- カバレッジ80%以上
`;
  
  await fs.mkdir(path.dirname(INSTRUCTIONS_PATH), { recursive: true });
  await fs.writeFile(INSTRUCTIONS_PATH, structuredContent, 'utf-8');
  console.log('  → 構造化された指示書を作成');
  
  // analyze実行
  const result = await onboarding({ action: 'analyze' });
  console.log('\n--- analyze結果 ---');
  console.log(result);
  
  // 状態確認
  const status = await getOnboardingStatus();
  console.log('\n--- 状態 ---');
  console.log(JSON.stringify(status, null, 2));
  
  assert(status.pattern === 'structured', 'pattern should be structured');
  assert(status.status === 'completed', 'status should be completed (auto-completed)');
  assert(status.restrictedMode === false, 'restrictedMode should be false');
  assert(result.includes('互換性があります'), 'result should mention compatibility');
  assert(result.includes('通常モード'), 'result should mention normal mode');
  assert(result.includes('conventions: TypeScript規約'), 'result should list sections');
});

const test3 = test('Pattern 3 (unstructured): 自由形式 → analyze → 制限モード', async () => {
  await resetState();
  
  // 非構造化された指示書を作成
  const unstructuredContent = `TypeScript規約
- anyは使わない
- camelCase命名

テストはJestで書く
カバレッジ80%以上

API認証はJWTで実装
`;
  
  await fs.mkdir(path.dirname(INSTRUCTIONS_PATH), { recursive: true });
  await fs.writeFile(INSTRUCTIONS_PATH, unstructuredContent, 'utf-8');
  console.log('  → 非構造化された指示書を作成');
  
  // analyze実行
  const result = await onboarding({ action: 'analyze' });
  console.log('\n--- analyze結果 ---');
  console.log(result);
  
  // 状態確認
  const status = await getOnboardingStatus();
  console.log('\n--- 状態 ---');
  console.log(JSON.stringify(status, null, 2));
  
  assert(status.pattern === 'unstructured', 'pattern should be unstructured');
  assert(status.status === 'analyzed', 'status should be analyzed (not auto-completed)');
  assert(status.restrictedMode === true, 'restrictedMode should be true');
  assert(result.includes('提案するセクション'), 'result should mention section suggestions');
  assert(result.includes('機能制限モード'), 'result should mention restricted mode');
  assert(result.includes('TypeScript規約'), 'result should suggest section');
});

const test4 = test('Pattern 4 (messy): 問題あり → analyze → 制限モード + 問題検出', async () => {
  await resetState();
  
  // 矛盾・重複のある指示書を作成
  const messyContent = `# Copilot Instructions

## TypeScript規約

- anyは禁止です
- anyを使ってOKです

## テストパターン

- Jestを使用

## テストパターン

- Vitestを使用

命名はcamelCaseで
変数名はsnake_caseで
`;
  
  await fs.mkdir(path.dirname(INSTRUCTIONS_PATH), { recursive: true });
  await fs.writeFile(INSTRUCTIONS_PATH, messyContent, 'utf-8');
  console.log('  → 矛盾・重複のある指示書を作成');
  
  // analyze実行
  const result = await onboarding({ action: 'analyze' });
  console.log('\n--- analyze結果 ---');
  console.log(result);
  
  // 状態確認
  const status = await getOnboardingStatus();
  console.log('\n--- 状態 ---');
  console.log(JSON.stringify(status, null, 2));
  
  assert(status.pattern === 'messy', 'pattern should be messy');
  assert(status.status === 'analyzed', 'status should be analyzed');
  assert(status.restrictedMode === true, 'restrictedMode should be true');
  assert(status.problems && status.problems.length > 0, 'should detect problems');
  assert(result.includes('問題が検出'), 'result should mention problems');
  assert(result.includes('機能制限モード'), 'result should mention restricted mode');
  
  // 矛盾検出確認
  const hasContradiction = status.problems?.some(p => p.type === 'contradiction');
  assert(hasContradiction === true, 'should detect contradiction');
  
  // 重複検出確認
  const hasDuplication = status.problems?.some(p => p.type === 'duplication');
  assert(hasDuplication === true, 'should detect duplication');
});

const test5 = test('制限モード: update blocked', async () => {
  await resetState();
  
  // 制限モード状態を作成（unstructured pattern）
  await saveOnboardingStatus({
    version: '1.0.0',
    status: 'analyzed',
    pattern: 'unstructured',
    analyzedAt: new Date().toISOString(),
    restrictedMode: true,
    canRollback: false,
  });
  console.log('  → 制限モード状態を設定');
  
  // update試行
  const result = await instructionsStructure({
    action: 'update',
    heading: 'test',
    content: 'test content',
  });
  console.log('\n--- update結果 ---');
  console.log(result);
  
  assert(result.includes('機能制限モード'), 'should mention restricted mode');
  assert(result.includes('利用できません'), 'should mention unavailable');
  assert(result.includes('onboarding'), 'should guide to onboarding');
});

const test6 = test('制限モード: read allowed', async () => {
  await resetState();
  
  // 制限モード状態 + 簡単な指示書
  await saveOnboardingStatus({
    version: '1.0.0',
    status: 'analyzed',
    pattern: 'unstructured',
    analyzedAt: new Date().toISOString(),
    restrictedMode: true,
    canRollback: false,
  });
  
  const simpleContent = `# Test\n\n## Section 1\n\nContent`;
  await fs.mkdir(path.dirname(INSTRUCTIONS_PATH), { recursive: true });
  await fs.writeFile(INSTRUCTIONS_PATH, simpleContent, 'utf-8');
  console.log('  → 制限モード + 簡単な指示書を設定');
  
  // read試行
  const result = await instructionsStructure({ action: 'read' });
  console.log('\n--- read結果 ---');
  console.log(result);
  
  // エラーメッセージが含まれていないことを確認
  assert(!result.includes('機能制限モード'), 'should not show restricted mode error for read');
  assert(result.includes('Section 1'), 'should return section data');
});

const test7 = test('guidance shows status', async () => {
  await resetState();
  
  // 制限モード状態を設定
  await saveOnboardingStatus({
    version: '1.0.0',
    status: 'analyzed',
    pattern: 'unstructured',
    analyzedAt: new Date().toISOString(),
    restrictedMode: true,
    canRollback: false,
  });
  
  const simpleContent = `# Test Content`;
  await fs.mkdir(path.dirname(INSTRUCTIONS_PATH), { recursive: true });
  await fs.writeFile(INSTRUCTIONS_PATH, simpleContent, 'utf-8');
  console.log('  → オンボーディング状態を設定');
  
  // guidance current-state実行
  const result = await guidance({ action: 'current-state' });
  console.log('\n--- guidance current-state結果 ---');
  console.log(result);
  
  assert(result.includes('オンボーディング状態'), 'should show onboarding section');
  assert(result.includes('分析済み'), 'should show analyzed status');
  assert(result.includes('非構造化'), 'should show unstructured pattern');
  assert(result.includes('機能制限モード'), 'should mention restricted mode');
  assert(result.includes('制限される機能'), 'should list restricted functions');
  assert(result.includes('利用可能な機能'), 'should list available functions');
});

// メイン実行
async function main() {
  console.log('PBI-009 Phase A+D テスト開始\n');
  
  await setup();
  
  try {
    // 全テスト実行
    await test1();
    await test2();
    await test3();
    await test4();
    await test5();
    await test6();
    await test7();
    
    // サマリー
    console.log('\n' + '='.repeat(80));
    console.log('テストサマリー');
    console.log('='.repeat(80));
    console.log(`Total: ${testCount}`);
    console.log(`Pass:  ${passCount}`);
    console.log(`Fail:  ${failCount}`);
    console.log('='.repeat(80));
    
    if (failCount > 0) {
      console.error(`\n❌ ${failCount}個のテストが失敗しました`);
      process.exit(1);
    } else {
      console.log(`\n✅ すべてのテストが成功しました`);
    }
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
