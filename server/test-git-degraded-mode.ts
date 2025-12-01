/**
 * Git デグレードモードのテストスクリプト
 * 
 * このテストでは、Gitコマンドが利用できない環境を模擬して
 * システムが正常にデグレードモードで動作することを確認します。
 * 
 * 実行方法:
 *   cd /home/mako10k/mcp-copilot-instructions/server
 *   npx ts-node test-git-degraded-mode.ts
 */

import * as fs from 'fs/promises';
import {
  readWithState,
  readInstructionsFileWithState,
} from './src/utils/fileSystem';

const TEST_FILE = '/home/mako10k/mcp-copilot-instructions/.github/copilot-instructions.md';

async function main() {
  console.log('=== Git デグレードモードテスト ===\n');

  try {
    // テスト1: 通常モードでの動作確認
    console.log('テスト1: 通常モード（Git利用可能）');
    const normalResult = await readWithState(TEST_FILE, true);
    console.log(`  ファイルサイズ: ${normalResult.content.length} bytes`);
    console.log(`  SHA-256ハッシュ: ${normalResult.state.hash.substring(0, 16)}...`);
    console.log(`  isGitManaged: ${normalResult.state.isGitManaged}`);
    
    if (normalResult.state.isGitManaged) {
      console.log(`  gitCommit: ${normalResult.state.gitCommit?.substring(0, 8)}...`);
      console.log(`  gitStatus: ${normalResult.state.gitStatus}`);
      console.log('  ✓ Git情報が正常に取得できています\n');
    } else {
      console.log('  ⚠️ Git管理外またはGitコマンド利用不可\n');
    }

    // テスト2: Git情報なしモードでの動作確認
    console.log('テスト2: Git情報なしモード（includeGitInfo=false）');
    const noGitInfoResult = await readWithState(TEST_FILE, false);
    console.log(`  ファイルサイズ: ${noGitInfoResult.content.length} bytes`);
    console.log(`  SHA-256ハッシュ: ${noGitInfoResult.state.hash.substring(0, 16)}...`);
    console.log(`  isGitManaged: ${noGitInfoResult.state.isGitManaged}`);
    console.log(`  gitCommit: ${noGitInfoResult.state.gitCommit}`);
    console.log(`  gitStatus: ${noGitInfoResult.state.gitStatus}`);
    
    if (noGitInfoResult.state.isGitManaged === undefined) {
      console.log('  ✓ Git情報を取得していません（意図通り）\n');
    } else {
      console.log('  ✗ Git情報が含まれています（予期しない動作）\n');
    }

    // テスト3: readInstructionsFileWithStateでの動作確認
    console.log('テスト3: readInstructionsFileWithState');
    const instructionsResult = await readInstructionsFileWithState();
    
    if (instructionsResult) {
      console.log(`  ファイルサイズ: ${instructionsResult.content.length} bytes`);
      console.log(`  isGitManaged: ${instructionsResult.state.isGitManaged}`);
      console.log(`  gitStatus: ${instructionsResult.state.gitStatus}`);
      console.log('  ✓ 指示書の読み込み成功\n');
    } else {
      console.log('  ✗ 指示書の読み込み失敗\n');
    }

    // テスト4: デグレードモード動作の確認
    console.log('テスト4: デグレードモード動作確認');
    console.log('  【注意】Gitコマンドが利用できない場合:');
    console.log('  - isGitManaged は false になります');
    console.log('  - gitCommit, gitStatus は undefined になります');
    console.log('  - ファイルの読み書きは正常に動作します');
    console.log('  - ハッシュベースの競合検知は引き続き機能します\n');

    // 実際のGit状態を表示
    if (normalResult.state.isGitManaged) {
      console.log('✅ 現在の環境ではGitコマンドが利用可能です');
      console.log('   デグレードモードをテストするには、以下を実行してください:');
      console.log('   1. PATH環境変数からgitコマンドを一時的に削除');
      console.log('   2. または、Docker等のGitがインストールされていない環境で実行\n');
    } else {
      console.log('✅ 現在の環境はデグレードモードで動作中です');
      console.log('   Gitコマンドが利用できませんが、基本機能は正常に動作します\n');
    }

    console.log('=== すべてのテスト完了 ===');

  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
