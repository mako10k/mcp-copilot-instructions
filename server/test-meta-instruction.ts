#!/usr/bin/env node

/**
 * test-meta-instruction.ts
 * PBI-010 Phase B 検証スクリプト
 * 
 * 検証項目:
 * 1. メタ指示セクションが生成されるか
 * 2. 各phase別のガイダンスが正しく生成されるか
 * 3. focus別のガイダンスが正しく生成されるか
 * 4. トークン数の増加量を測定
 * 5. 生成ファイルの長さを測定
 */

import { generateInstructions, DevelopmentContext } from './src/utils/generateInstructions';
import { generateFullMetaInstruction } from './src/utils/metaInstructionTemplate';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  testName: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function addResult(testName: string, passed: boolean, details?: string): void {
  results.push({ testName, passed, details });
}

/**
 * テスト1: 基本的なメタ指示の生成
 */
async function testBasicMetaInstruction(): Promise<void> {
  console.log('\n[Test 1] 基本的なメタ指示の生成');
  
  const context: DevelopmentContext = {
    phase: 'development',
    focus: [],
    priority: 'medium',
    mode: 'normal',
  };
  
  const metaInstruction = generateFullMetaInstruction(context);
  
  // チェック1: '## meta:' で始まるか
  const hasHeader = metaInstruction.startsWith('## meta:');
  addResult('メタ指示ヘッダーの存在', hasHeader, hasHeader ? 'OK' : 'ヘッダーが見つかりません');
  
  // チェック2: 5つのサブセクションが含まれているか
  const requiredSections = [
    '### 開発状態の管理',
    '### 開発ルールの登録',
    '### 指示書の自己認識',
    '### 既存ルールとの整合性確認',
    '### 既存プロジェクトへの導入',
  ];
  
  for (const section of requiredSections) {
    const hasSection = metaInstruction.includes(section);
    addResult(`サブセクション: ${section}`, hasSection, hasSection ? 'OK' : '見つかりません');
  }
  
  // チェック3: ツール名が言及されているか
  const tools = [
    'change_context',
    'project_context',
    'instructions_structure',
    'onboarding',
  ];
  
  for (const tool of tools) {
    const hasTool = metaInstruction.includes(tool);
    addResult(`ツール名: ${tool}`, hasTool, hasTool ? 'OK' : '見つかりません');
  }
  
  // チェック4: トークン数を概算（1トークン ≒ 4文字）
  const estimatedTokens = Math.ceil(metaInstruction.length / 4);
  addResult('トークン数の概算', true, `約 ${estimatedTokens} トークン（${metaInstruction.length} 文字）`);
}

/**
 * テスト2: phase別のガイダンス生成
 */
async function testPhaseSpecificGuidance(): Promise<void> {
  console.log('\n[Test 2] phase別のガイダンス生成');
  
  const phases: Array<DevelopmentContext['phase']> = [
    'development',
    'testing',
    'debugging',
    'refactoring',
    'documentation',
  ];
  
  for (const phase of phases) {
    const context: DevelopmentContext = {
      phase,
      focus: [],
      priority: 'medium',
      mode: 'normal',
    };
    
    const metaInstruction = generateFullMetaInstruction(context);
    const hasPhaseGuidance = metaInstruction.includes(`**現在: ${getPhaseLabel(phase)}フェーズ**`);
    
    addResult(
      `phase=${phase} のガイダンス`,
      hasPhaseGuidance,
      hasPhaseGuidance ? 'OK' : 'フェーズ固有のガイダンスが見つかりません'
    );
  }
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    development: '開発',
    testing: 'テスト',
    debugging: 'デバッグ',
    refactoring: 'リファクタリング',
    documentation: 'ドキュメント作成',
  };
  return labels[phase] || phase;
}

/**
 * テスト3: focus別のガイダンス生成
 */
async function testFocusSpecificGuidance(): Promise<void> {
  console.log('\n[Test 3] focus別のガイダンス生成');
  
  const testCases = [
    { focus: ['API実装'], expectedKeyword: 'API関連' },
    { focus: ['認証'], expectedKeyword: '認証関連' },
    { focus: ['データベース設計'], expectedKeyword: 'データベース関連' },
    { focus: ['テスト'], expectedKeyword: 'テスト関連' },
    { focus: ['パフォーマンス最適化'], expectedKeyword: 'パフォーマンス関連' },
  ];
  
  for (const testCase of testCases) {
    const context: DevelopmentContext = {
      phase: 'development',
      focus: testCase.focus,
      priority: 'medium',
      mode: 'normal',
    };
    
    const metaInstruction = generateFullMetaInstruction(context);
    const hasFocusGuidance = metaInstruction.includes(testCase.expectedKeyword);
    
    addResult(
      `focus=${testCase.focus[0]}`,
      hasFocusGuidance,
      hasFocusGuidance ? 'OK' : `"${testCase.expectedKeyword}" が見つかりません`
    );
  }
}

/**
 * テスト4: 実際の生成ファイルにメタ指示が含まれているか
 */
async function testGeneratedFile(): Promise<void> {
  console.log('\n[Test 4] 実際の生成ファイルにメタ指示が含まれているか');
  
  const context: DevelopmentContext = {
    phase: 'development',
    focus: ['API', 'JWT'],
    priority: 'high',
    mode: 'normal',
  };
  
  try {
    const result = await generateInstructions(context);
    
    addResult('指示書の生成', result.success, result.success ? `${result.sectionsCount} セクション生成` : '失敗');
    
    // 生成されたファイルを読み込み
    const workspaceRoot = path.resolve(__dirname, '../');
    const generatedPath = path.join(workspaceRoot, '.github/copilot-instructions.md');
    
    const content = await fs.readFile(generatedPath, 'utf-8');
    
    // メタ指示セクションが含まれているか
    const hasMetaSection = content.includes('## meta: ツール活用ガイド');
    addResult('生成ファイルにメタ指示セクションが存在', hasMetaSection, hasMetaSection ? 'OK' : '見つかりません');
    
    // ファイルサイズを測定
    const fileSizeBytes = Buffer.byteLength(content, 'utf-8');
    const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);
    addResult('生成ファイルのサイズ', true, `${fileSizeBytes} bytes (${fileSizeKB} KB)`);
    
    // メタ指示の位置を確認（先頭に近い位置にあるか）
    const metaSectionIndex = content.indexOf('## meta: ツール活用ガイド');
    const firstSeparatorIndex = content.indexOf('---');
    const isNearTop = metaSectionIndex > 0 && metaSectionIndex < firstSeparatorIndex;
    addResult(
      'メタ指示が先頭に配置されている',
      isNearTop,
      isNearTop ? `位置: ${metaSectionIndex} 文字目` : 'メタ指示が先頭にありません'
    );
  } catch (error) {
    addResult('指示書の生成', false, `エラー: ${error}`);
  }
}

/**
 * テスト5: トークン増加量の測定
 */
async function testTokenIncrease(): Promise<void> {
  console.log('\n[Test 5] トークン増加量の測定');
  
  const context: DevelopmentContext = {
    phase: 'development',
    focus: ['API', 'JWT'],
    priority: 'high',
    mode: 'normal',
  };
  
  const metaInstruction = generateFullMetaInstruction(context);
  
  // メタ指示のトークン数（概算: 1トークン ≒ 4文字）
  const metaTokens = Math.ceil(metaInstruction.length / 4);
  
  // 目標: 200-300トークン
  const isWithinTarget = metaTokens >= 200 && metaTokens <= 300;
  addResult(
    'トークン数が目標範囲内（200-300）',
    isWithinTarget,
    `${metaTokens} トークン（目標: 200-300）`
  );
  
  // 全体ファイルサイズに対する割合を推定
  const workspaceRoot = path.resolve(__dirname, '../');
  const generatedPath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  
  try {
    const content = await fs.readFile(generatedPath, 'utf-8');
    const totalTokens = Math.ceil(content.length / 4);
    const percentage = ((metaTokens / totalTokens) * 100).toFixed(2);
    
    addResult(
      'メタ指示の割合',
      true,
      `${percentage}% (全体: ${totalTokens} トークン)`
    );
    
    // 目標: 5-10%
    const percentageNum = parseFloat(percentage);
    const isPercentageOk = percentageNum >= 5 && percentageNum <= 10;
    addResult(
      '割合が目標範囲内（5-10%）',
      isPercentageOk,
      isPercentageOk ? 'OK' : `${percentage}% (目標: 5-10%)`
    );
  } catch {
    addResult('割合の計算', false, '生成ファイルが見つかりません');
  }
}

/**
 * 結果を表示
 */
function printResults(): void {
  console.log('\n' + '='.repeat(70));
  console.log('テスト結果サマリー');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${status}${reset} ${result.testName}`);
    if (result.details) {
      console.log(`  ${result.details}`);
    }
  }
  
  console.log('='.repeat(70));
  console.log(`合計: ${passed}/${total} テスト成功`);
  console.log('='.repeat(70));
  
  if (passed === total) {
    console.log('\n✅ すべてのテストが成功しました！');
  } else {
    console.log(`\n⚠️  ${total - passed} 件のテストが失敗しました。`);
    process.exit(1);
  }
}

/**
 * メイン実行
 */
async function main(): Promise<void> {
  console.log('PBI-010 Phase B 検証開始\n');
  console.log('検証内容:');
  console.log('1. メタ指示セクションの生成');
  console.log('2. phase別のガイダンス生成');
  console.log('3. focus別のガイダンス生成');
  console.log('4. 実際の生成ファイルにメタ指示が含まれているか');
  console.log('5. トークン増加量の測定');
  
  await testBasicMetaInstruction();
  await testPhaseSpecificGuidance();
  await testFocusSpecificGuidance();
  await testGeneratedFile();
  await testTokenIncrease();
  
  printResults();
}

main().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
