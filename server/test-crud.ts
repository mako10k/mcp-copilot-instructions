import { projectContext } from './src/tools/project_context';

async function testCRUD() {
  console.log('=== テスト開始 ===\n');

  // 1. 既存コンテキスト読み取り
  console.log('1. read: 既存コンテキスト');
  const readResult = await projectContext({ action: 'read' });
  console.log(readResult);
  console.log();

  // 2. update: 既存コンテキストを更新
  console.log('2. update: 優先度とタグを変更');
  const updateResult = await projectContext({
    action: 'update',
    id: 'ctx-1764564670175-qqahhjb0s',
    priority: 10,
    tags: ['architecture', 'design-principle', 'mcp-server', 'updated'],
  });
  console.log(updateResult);
  console.log();

  // 3. read: 更新確認
  console.log('3. read: 更新後の確認');
  const readAfterUpdate = await projectContext({ action: 'read' });
  console.log(readAfterUpdate);
  console.log();

  // 4. filter: カテゴリフィルタ
  console.log('4. read with filter: category=constraints');
  const filterByCat = await projectContext({
    action: 'read',
    category: 'constraints',
  });
  console.log(filterByCat);
  console.log();

  // 5. filter: タグフィルタ
  console.log('5. read with filter: tags=updated');
  const filterByTag = await projectContext({
    action: 'read',
    tags: ['updated'],
  });
  console.log(filterByTag);
  console.log();

  // 6. filter: 優先度フィルタ
  console.log('6. read with filter: priority 9-10');
  const filterByPriority = await projectContext({
    action: 'read',
    minPriority: 9,
    maxPriority: 10,
  });
  console.log(filterByPriority);
  console.log();

  // 7. create: 新規コンテキスト作成
  console.log('7. create: テスト用コンテキスト');
  const createResult = await projectContext({
    action: 'create',
    category: 'test',
    title: 'テストコンテキスト',
    description: 'delete機能テスト用',
    priority: 3,
    tags: ['test', 'temporary'],
  });
  console.log(createResult);
  const newId = createResult.match(/ID: (ctx-[^\n]+)/)?.[1];
  console.log();

  // 8. read: 作成確認
  console.log('8. read: 全コンテキスト（2件になっているはず）');
  const readAfterCreate = await projectContext({ action: 'read' });
  console.log(readAfterCreate);
  console.log();

  // 9. delete: 新規作成したコンテキストを削除
  if (newId) {
    console.log('9. delete: テスト用コンテキスト削除');
    const deleteResult = await projectContext({
      action: 'delete',
      id: newId,
    });
    console.log(deleteResult);
    console.log();

    // 10. read: 削除確認
    console.log('10. read: 削除後の確認（1件に戻っているはず）');
    const readAfterDelete = await projectContext({ action: 'read' });
    console.log(readAfterDelete);
    console.log();
  }

  // 11. エラーケース: 存在しないIDでupdate
  console.log('11. エラーケース: 存在しないIDでupdate');
  const updateError = await projectContext({
    action: 'update',
    id: 'ctx-nonexistent',
    title: '存在しない',
  });
  console.log(updateError);
  console.log();

  // 12. エラーケース: 存在しないIDでdelete
  console.log('12. エラーケース: 存在しないIDでdelete');
  const deleteError = await projectContext({
    action: 'delete',
    id: 'ctx-nonexistent',
  });
  console.log(deleteError);
  console.log();

  console.log('=== テスト完了 ===');
}

testCRUD().catch(console.error);
