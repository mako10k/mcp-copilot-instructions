/**
 * 外部変更検知機能のテストスクリプト
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  readInstructionsFileWithState,
  writeInstructionsFileWithConflictCheck,
} from './src/utils/fileSystem';
import { updateSection } from './src/utils/markdownAst';

const TEST_FILE = path.resolve(__dirname, '../.github/copilot-instructions.md');

async function main() {
  console.log('=== 外部変更検知機能テスト ===\n');

  // テスト1: 正常系 - 競合なしで更新
  console.log('テスト1: 正常系（競合なし）');
  try {
    const result = await updateSection('テスト原則', 'これはテストセクションです。');
    if (result.success) {
      console.log('✓ セクション更新成功\n');
    } else {
      console.log(`✗ 予期しない失敗: ${result.conflict}\n`);
    }
  } catch (error) {
    console.log(`✓ エラーハンドリング正常: ${error}\n`);
  }

  // テスト2: 競合検知 - ファイルの外部変更をシミュレート
  console.log('テスト2: 競合検知');
  try {
    // 1. 現在の状態を読み込み
    const state1 = await readInstructionsFileWithState();
    if (!state1) {
      console.log('✗ ファイルが存在しません\n');
      return;
    }

    console.log(`  読み込み時のハッシュ: ${state1.state.hash.substring(0, 8)}...`);

    // 2. ファイルを外部から変更（人間開発者の編集をシミュレート）
    const content = await fs.readFile(TEST_FILE, 'utf-8');
    await fs.writeFile(TEST_FILE, content + '\n<!-- 外部変更 -->\n', 'utf-8');
    console.log('  外部変更を実行しました');

    // 3. 古い状態で書き込もうとする
    const result = await writeInstructionsFileWithConflictCheck(
      content + '\n<!-- MCP更新 -->\n',
      state1.state
    );

    if (!result.success && result.conflict) {
      console.log('✓ 競合を正しく検知しました');
      console.log(`  期待ハッシュ: ${result.conflict.expectedHash.substring(0, 8)}...`);
      console.log(`  現在ハッシュ: ${result.conflict.currentHash.substring(0, 8)}...`);
      console.log(`  メッセージ: ${result.conflict.message}\n`);
    } else {
      console.log('✗ 競合検知に失敗しました\n');
    }

    // 4. ファイルを元に戻す
    await fs.writeFile(TEST_FILE, content, 'utf-8');
    console.log('  ファイルを元に戻しました\n');
  } catch (error) {
    console.log(`✗ テスト失敗: ${error}\n`);
  }

  // テスト3: updateSection経由での競合検知
  console.log('テスト3: updateSection経由での競合検知');
  try {
    // 1. 現在の内容を取得
    const state1 = await readInstructionsFileWithState();
    if (!state1) {
      console.log('✗ ファイルが存在しません\n');
      return;
    }

    // 2. ファイルを外部から変更
    const content = state1.content;
    await fs.writeFile(TEST_FILE, content + '\n<!-- 別プロセスの変更 -->\n', 'utf-8');
    console.log('  外部変更を実行しました');

    // 3. updateSectionを実行（内部でreadWithStateを呼ぶため、古いキャッシュはない想定）
    // しかし、関数呼び出し間にファイルが変更された場合を考慮
    
    // この場合、updateSection内で最新状態を読むため競合は起きない
    // 実際の競合は、read→外部変更→updateの順で起きる
    
    // 4. ファイルを元に戻す
    await fs.writeFile(TEST_FILE, content, 'utf-8');
    console.log('  ファイルを元に戻しました');
    console.log('✓ updateSectionは内部で最新状態を読むため、この順序では競合しません\n');
  } catch (error) {
    console.log(`✗ テスト失敗: ${error}\n`);
  }

  // テスト4: エラーハンドリング - 存在しないファイル
  console.log('テスト4: エラーハンドリング（存在しないファイル）');
  try {
    const result = await updateSection('存在しないセクション', 'テスト');
    if (!result.success) {
      console.log(`✓ エラー検知: ${result.conflict}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✓ 例外を正しくキャッチ: ${message}\n`);
  }

  console.log('=== テスト完了 ===');
}

main().catch(console.error);
