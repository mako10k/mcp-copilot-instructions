import { instructionsStructure } from './src/tools/instructions_structure';
import { getLockStatus } from './src/utils/lockManager';

/**
 * 並行更新テスト
 * 複数のセッションが同時に指示書を更新しようとする状況をシミュレート
 */
async function main() {
  console.log('=== 排他制御テスト ===\n');

  // Test 1: 初期状態の確認
  console.log('Test 1: ロック状態の確認');
  const initialLock = await getLockStatus();
  console.log('ロック状態:', initialLock || 'ロックされていません');
  console.log('\n---\n');

  // Test 2: 単一セッションでの更新（正常系）
  console.log('Test 2: 単一セッションでの更新');
  try {
    const result = await instructionsStructure({
      action: 'update',
      heading: 'テストセクション',
      content: 'Test 2: 単一セッション更新テスト',
    });
    console.log('結果:', result);
  } catch (error) {
    console.error('エラー:', error);
  }
  console.log('\n---\n');

  // Test 3: ロック機構の基本動作確認
  console.log('Test 3: ロック取得・解放の基本動作');
  console.log('手動でロックを取得して保持します...\n');

  const { acquireLock, releaseLock } = await import('./src/utils/lockManager');
  
  // ロックを取得して保持
  const sessionId = await acquireLock();
  console.log('ロック取得成功:', sessionId);
  
  // ロック状態を確認
  const lockStatus = await getLockStatus();
  console.log('現在のロック:', lockStatus);
  
  // 別のセッションがロック取得を試みる（タイムアウト 500ms）
  console.log('\n別セッションがロック取得を試みます（タイムアウト: 500ms）...');
  const startTime = Date.now();
  const session2Id = await acquireLock(500);
  const elapsedTime = Date.now() - startTime;
  
  if (session2Id) {
    console.log('✗ 予期しない結果: ロック取得に成功してしまいました');
  } else {
    console.log(`✓ 期待通り: ロック取得タイムアウト（${elapsedTime}ms）`);
  }
  
  // ロックを解放
  if (sessionId) {
    await releaseLock(sessionId);
    console.log('\nロックを解放しました');
  }
  
  // 解放後にロック取得
  const session3Id = await acquireLock();
  console.log('解放後のロック取得:', session3Id ? '✓ 成功' : '✗ 失敗');
  if (session3Id) {
    await releaseLock(session3Id);
  }
  
  const [result1, result2] = [{ status: 'fulfilled' as const, value: 'Test 3 完了' }, { status: 'fulfilled' as const, value: 'Test 3 完了' }];

  console.log('\n---\n');

  // Test 4: 古いロックの自動削除テスト
  console.log('Test 4: 古いロックの自動削除（デッドロック防止）');
  console.log('タイムアウトの2倍古いロックをシミュレートします...\n');

  const { acquireLock: acquireLock2, releaseLock: releaseLock2 } = await import('./src/utils/lockManager');
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // 古いロックファイルを手動で作成
  const lockPath = path.join(process.cwd(), '../.copilot-state/.lock');
  const staleLock = {
    sessionId: 'stale-session-12345',
    acquiredAt: Date.now() - 11000, // 11秒前（タイムアウト5秒の2倍以上）
    pid: 99999,
  };
  
  await fs.writeFile(lockPath, JSON.stringify(staleLock, null, 2));
  console.log('古いロックを作成しました（11秒前）');
  
  // 新しいセッションがロック取得を試みる
  console.log('\n新しいセッションがロック取得を試みます...');
  const newSessionId = await acquireLock2(1000);
  
  if (newSessionId) {
    console.log('✓ 期待通り: 古いロックを削除して新規取得に成功');
    await releaseLock2(newSessionId);
  } else {
    console.log('✗ 予期しない結果: ロック取得に失敗');
  }
  
  console.log('\n---\n');

  // Test 5: 順次更新テスト（排他制御が正しく解放されることの確認）
  console.log('Test 5: 順次更新テスト（ロック解放確認）');
  console.log('3回連続で更新を試みます...\n');

  for (let i = 1; i <= 3; i++) {
    try {
      const result = await instructionsStructure({
        action: 'update',
        heading: 'テストセクション',
        content: `Test 5: ${i}回目の更新`,
      });
      console.log(`${i}回目: ✓`, result);
    } catch (error) {
      console.log(`${i}回目: ✗`, error);
    }
  }

  console.log('\n期待動作: すべて成功（ロックが正しく解放されている）');
  console.log('\n---\n');

  // Test 6: 最終ロック状態の確認
  console.log('Test 6: 最終ロック状態の確認');
  const finalLock = await getLockStatus();
  console.log('ロック状態:', finalLock || 'ロックされていません');
  console.log('期待動作: ロックされていない（すべて解放済み）');
  console.log('\n---\n');

  console.log('すべてのテストが完了しました。');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
