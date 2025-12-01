/**
 * Git統合機能のテストスクリプト
 * 
 * 実行方法:
 *   cd /home/mako10k/mcp-copilot-instructions/server
 *   npx ts-node test-git-integration.ts
 */

import * as fs from 'fs/promises';
import {
  readWithState,
  checkGitManaged,
  getGitCommit,
  getGitStatus,
  getGitDiff,
  readInstructionsFileWithState,
} from './src/utils/fileSystem';

const TEST_FILE = '/home/mako10k/mcp-copilot-instructions/.github/copilot-instructions.md';

async function main() {
  console.log('=== Git統合機能テスト ===\n');

  try {
    // テスト1: Git管理状態の確認
    console.log('テスト1: Git管理状態の確認');
    const isGitManaged = await checkGitManaged(TEST_FILE);
    console.log(`  isGitManaged: ${isGitManaged}`);
    if (isGitManaged) {
      console.log('  ✓ Gitリポジトリ内であることを確認\n');
    } else {
      console.log('  ✗ Gitリポジトリ外（予期しない結果）\n');
    }

    // テスト2: Gitコミットハッシュの取得
    console.log('テスト2: 現在のコミットハッシュ取得');
    const gitCommit = await getGitCommit(TEST_FILE);
    if (gitCommit) {
      console.log(`  ✓ コミットハッシュ: ${gitCommit.substring(0, 8)}...\n`);
    } else {
      console.log('  ✗ コミットハッシュ取得失敗\n');
    }

    // テスト3: ファイルのGitステータス確認
    console.log('テスト3: ファイルのGitステータス確認');
    const gitStatus = await getGitStatus(TEST_FILE);
    console.log(`  ✓ ステータス: ${gitStatus}\n`);

    // テスト4: readWithStateでGit情報を含めて読み込み
    console.log('テスト4: readWithState(Git情報付き)');
    const result = await readWithState(TEST_FILE, true);
    console.log(`  ファイルサイズ: ${result.content.length} bytes`);
    console.log(`  SHA-256ハッシュ: ${result.state.hash.substring(0, 16)}...`);
    console.log(`  isGitManaged: ${result.state.isGitManaged}`);
    console.log(`  gitCommit: ${result.state.gitCommit?.substring(0, 8)}...`);
    console.log(`  gitStatus: ${result.state.gitStatus}`);
    console.log('  ✓ Git情報の取得成功\n');

    // テスト5: readInstructionsFileWithState
    console.log('テスト5: readInstructionsFileWithState');
    const instructionsResult = await readInstructionsFileWithState();
    if (instructionsResult) {
      console.log(`  ファイルサイズ: ${instructionsResult.content.length} bytes`);
      console.log(`  isGitManaged: ${instructionsResult.state.isGitManaged}`);
      console.log(`  gitStatus: ${instructionsResult.state.gitStatus}`);
      console.log('  ✓ 指示書の読み込み成功\n');
    } else {
      console.log('  ✗ 指示書の読み込み失敗\n');
    }

    // テスト6: ファイルを変更してdiffを確認
    console.log('テスト6: ファイル変更後のdiff確認（テストセクション追加）');
    const originalContent = await fs.readFile(TEST_FILE, 'utf-8');
    
    // テストセクションを追加
    const modifiedContent = originalContent.replace(
      '## 存在しないセクション',
      '## Git統合テスト\n\nこれはGit統合機能のテストです。\n\n## 存在しないセクション'
    );
    await fs.writeFile(TEST_FILE, modifiedContent, 'utf-8');
    console.log('  ファイルを変更（テストセクション追加）');

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 100));

    // Gitステータスとdiffを確認
    const newStatus = await getGitStatus(TEST_FILE);
    const diff = await getGitDiff(TEST_FILE);
    
    console.log(`  新しいステータス: ${newStatus}`);
    if (diff) {
      console.log(`  diff検出: ${diff.split('\n').length}行`);
      console.log('  ✓ 変更検出成功\n');
    } else {
      console.log('  ✗ diff検出失敗\n');
    }

    // テスト7: readWithStateで変更を確認
    console.log('テスト7: 変更後のreadWithState');
    const changedResult = await readWithState(TEST_FILE, true);
    console.log(`  新しいハッシュ: ${changedResult.state.hash.substring(0, 16)}...`);
    console.log(`  ステータス: ${changedResult.state.gitStatus}`);
    
    if (changedResult.state.hash !== result.state.hash) {
      console.log('  ✓ ハッシュ値の変化を検出\n');
    } else {
      console.log('  ✗ ハッシュ値が変化していない\n');
    }

    // ファイルを元に戻す
    console.log('テスト後処理: ファイルを元に戻す');
    await fs.writeFile(TEST_FILE, originalContent, 'utf-8');
    console.log('  ✓ ファイルを元に戻しました\n');

    console.log('=== すべてのテスト完了 ===');

  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
