import { feedback } from './src/tools/feedback';

async function main() {
  console.log('=== feedbackツールのテスト ===\n');

  // Test 1: 初期状態の確認（フラグなし）
  console.log('Test 1: 初期状態の確認（フラグ付き指示を一覧表示）');
  const listResult1 = await feedback({ action: 'list' });
  console.log(listResult1);
  console.log('\n---\n');

  // Test 2: criticalFeedbackフラグを追加
  console.log('Test 2: TypeScript規約にcriticalFeedbackフラグを追加');
  const addResult1 = await feedback({
    action: 'add',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
    reason: '型安全性の重要性を強調するため',
  });
  console.log(addResult1);
  console.log('\n---\n');

  // Test 3: copilotEssentialフラグを追加
  console.log('Test 3: エラーハンドリングパターンにcopilotEssentialフラグを追加');
  const addResult2 = await feedback({
    action: 'add',
    filePath: 'patterns/error-handling.md',
    flagType: 'copilotEssential',
    reason: 'エラー処理は常に重要と判断',
  });
  console.log(addResult2);
  console.log('\n---\n');

  // Test 4: フラグ付き指示を一覧表示
  console.log('Test 4: フラグ付き指示を一覧表示');
  const listResult2 = await feedback({ action: 'list' });
  console.log(listResult2);
  console.log('\n---\n');

  // Test 5: criticalFeedbackのみをフィルタ
  console.log('Test 5: criticalFeedbackのみをフィルタ');
  const listResult3 = await feedback({
    action: 'list',
    filter: 'criticalFeedback',
  });
  console.log(listResult3);
  console.log('\n---\n');

  // Test 6: copilotEssentialのみをフィルタ
  console.log('Test 6: copilotEssentialのみをフィルタ');
  const listResult4 = await feedback({
    action: 'list',
    filter: 'copilotEssential',
  });
  console.log(listResult4);
  console.log('\n---\n');

  // Test 7: フラグを削除
  console.log('Test 7: TypeScript規約のcriticalFeedbackフラグを削除');
  const removeResult = await feedback({
    action: 'remove',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
  });
  console.log(removeResult);
  console.log('\n---\n');

  // Test 8: 削除後の状態確認
  console.log('Test 8: 削除後の状態確認');
  const listResult5 = await feedback({ action: 'list' });
  console.log(listResult5);
  console.log('\n---\n');

  // Test 9: もう一つのフラグも削除（クリーンアップ）
  console.log('Test 9: エラーハンドリングのcopilotEssentialフラグを削除（クリーンアップ）');
  const removeResult2 = await feedback({
    action: 'remove',
    filePath: 'patterns/error-handling.md',
    flagType: 'copilotEssential',
  });
  console.log(removeResult2);
  console.log('\n---\n');

  // Test 10: 最終状態確認
  console.log('Test 10: 最終状態確認（すべてクリア）');
  const listResult6 = await feedback({ action: 'list' });
  console.log(listResult6);
  console.log('\n---\n');

  // Test 11: ソフトリミットテスト（criticalFeedback）
  console.log('Test 11: ソフトリミットテスト - criticalFeedback 2個追加');
  await feedback({
    action: 'add',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
    reason: 'テスト1',
  });
  await feedback({
    action: 'add',
    filePath: 'patterns/error-handling.md',
    flagType: 'criticalFeedback',
    reason: 'テスト2',
  });
  const listResult7 = await feedback({ action: 'list' });
  console.log(listResult7);
  console.log('\n---\n');

  // Test 12: ソフトリミット到達時の警告確認
  console.log('Test 12: 3個目追加でソフトリミット警告表示');
  const addResult3 = await feedback({
    action: 'add',
    filePath: 'architecture/api-design.md',
    flagType: 'criticalFeedback',
    reason: 'テスト3（ソフトリミット到達）',
  });
  console.log(addResult3);
  console.log('\n---\n');

  // Test 13: ハードリミット到達時のエラー確認
  console.log('Test 13: 4個目追加でハードリミットエラー');
  const addResult4 = await feedback({
    action: 'add',
    filePath: 'patterns/testing.md',
    flagType: 'criticalFeedback',
    reason: 'テスト4（ハードリミット超過）',
  });
  console.log(addResult4);
  console.log('\n---\n');

  // Test 14: クリーンアップ
  console.log('Test 14: テストデータをクリーンアップ');
  await feedback({
    action: 'remove',
    filePath: 'conventions/typescript.md',
    flagType: 'criticalFeedback',
  });
  await feedback({
    action: 'remove',
    filePath: 'patterns/error-handling.md',
    flagType: 'criticalFeedback',
  });
  await feedback({
    action: 'remove',
    filePath: 'architecture/api-design.md',
    flagType: 'criticalFeedback',
  });
  const listResult8 = await feedback({ action: 'list' });
  console.log(listResult8);
  console.log('\n---\n');

  console.log('すべてのテストが完了しました。');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
