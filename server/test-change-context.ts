import { changeContext } from './src/tools/change_context';
import * as fs from 'fs/promises';
import * as path from 'path';

console.log('=== change_context ツールのテスト ===\n');

async function test() {
  try {
    // テスト1: 現在の状態を取得
    console.log('テスト1: 現在の状態を取得');
    const readResult = await changeContext({ action: 'read' });
    console.log(readResult);
    console.log();

    // テスト2: 開発フェーズに切り替え
    console.log('テスト2: 開発フェーズに切り替え（API認証に焦点）');
    const updateResult = await changeContext({
      action: 'update',
      state: {
        phase: 'development',
        focus: ['API認証', 'JWT', 'セキュリティ'],
        priority: 'high',
        mode: 'normal',
      },
    });
    console.log(updateResult);
    console.log();

    // テスト3: 生成された指示書を確認
    console.log('テスト3: 生成された指示書を確認');
    const workspaceRoot = path.resolve(__dirname, '../');
    const instructionsPath = path.join(workspaceRoot, '.github/copilot-instructions.md');
    
    const exists = await fs.access(instructionsPath).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(instructionsPath, 'utf-8');
      const lines = content.split('\n');
      console.log(`✓ .github/copilot-instructions.md が生成されました（${lines.length}行）`);
      console.log('\n[先頭20行のプレビュー]');
      console.log(lines.slice(0, 20).join('\n'));
    } else {
      console.log('✗ .github/copilot-instructions.md が見つかりません');
    }
    console.log();

    // テスト4: リファクタリングフェーズに切り替え
    console.log('テスト4: リファクタリングフェーズに切り替え');
    const refactorResult = await changeContext({
      action: 'update',
      state: {
        phase: 'refactoring',
        focus: ['コードレビュー', 'テストカバレッジ'],
        priority: 'medium',
      },
    });
    const refactorData = JSON.parse(refactorResult);
    console.log(`✓ フェーズ変更: ${refactorData.previousContext.phase} → ${refactorData.currentContext.phase}`);
    console.log(`✓ 指示書再生成: ${refactorData.regenerated?.sectionsCount || 0}セクション`);
    console.log();

    // テスト5: リセット
    console.log('テスト5: デフォルトに戻す');
    const resetResult = await changeContext({ action: 'reset' });
    console.log(resetResult);

    console.log('\n=== すべてのテスト完了 ===');
  } catch (error) {
    console.error('テストエラー:', error);
    process.exit(1);
  }
}

test();
