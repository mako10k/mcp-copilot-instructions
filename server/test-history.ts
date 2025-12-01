import { changeContext } from './src/tools/change_context';

async function main() {
  console.log('=== 履歴管理機能のテスト ===\n');

  // Test 1: 初期状態の確認
  console.log('Test 1: 初期履歴を確認');
  const listResult1 = await changeContext({ action: 'list-history', limit: 5 });
  console.log(listResult1);
  console.log('\n---\n');

  // Test 2: 開発フェーズで変更
  console.log('Test 2: 開発フェーズに変更（履歴作成）');
  const updateResult1 = await changeContext({
    action: 'update',
    state: {
      phase: 'development',
      focus: ['API認証', 'JWT'],
      priority: 'high',
    },
  });
  console.log(updateResult1);
  console.log('\n---\n');

  // 少し待機
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 3: リファクタリングフェーズに変更
  console.log('Test 3: リファクタリングフェーズに変更');
  const updateResult2 = await changeContext({
    action: 'update',
    state: {
      phase: 'refactoring',
      focus: ['コードレビュー', 'テストカバレッジ'],
      priority: 'medium',
    },
  });
  console.log(updateResult2);
  console.log('\n---\n');

  // Test 4: 履歴一覧を表示
  console.log('Test 4: 履歴一覧を表示（最大10件）');
  const listResult2 = await changeContext({ action: 'list-history', limit: 10 });
  console.log(listResult2);
  console.log('\n---\n');

  // Test 5: 差分を表示（最新 vs 1つ前）
  console.log('Test 5: 差分を表示（index 1 vs index 0）');
  const diffResult = await changeContext({
    action: 'show-diff',
    from: 1,
    to: 0,
  });
  console.log(diffResult);
  console.log('\n---\n');

  // Test 6: ロールバック（1つ前に戻す）
  console.log('Test 6: ロールバック（1つ前に戻す）');
  const rollbackResult = await changeContext({
    action: 'rollback',
    timestamp: 1,  // 1つ前
  });
  console.log(rollbackResult);
  console.log('\n---\n');

  // Test 7: ロールバック後のコンテキスト確認
  console.log('Test 7: ロールバック後のコンテキスト確認');
  const readResult = await changeContext({ action: 'read' });
  console.log(readResult);
  console.log('\n---\n');

  // Test 8: cleanup-history（テスト用に0日保持 = 全削除はしない）
  console.log('Test 8: 古い履歴のクリーンアップ（30日以上前）');
  const cleanupResult = await changeContext({
    action: 'cleanup-history',
    daysToKeep: 30,
  });
  console.log(cleanupResult);
  console.log('\n---\n');

  console.log('すべてのテストが完了しました。');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
