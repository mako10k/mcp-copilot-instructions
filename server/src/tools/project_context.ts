import {
  loadContexts,
  saveContexts,
  createContext,
  updateContext,
  deleteContext,
  filterContexts,
} from '../utils/contextStorage';

interface CreateContextArgs {
  action: 'create';
  category: string;
  title: string;
  description: string;
  priority?: number;
  tags?: string[];
}

interface ReadContextArgs {
  action: 'read';
  category?: string;
  tags?: string[];
  minPriority?: number;
  maxPriority?: number;
}

interface UpdateContextArgs {
  action: 'update';
  id: string;
  category?: string;
  title?: string;
  description?: string;
  priority?: number;
  tags?: string[];
}

interface DeleteContextArgs {
  action: 'delete';
  id: string;
}

type ProjectContextArgs =
  | CreateContextArgs
  | ReadContextArgs
  | UpdateContextArgs
  | DeleteContextArgs;

export async function projectContext(args: ProjectContextArgs) {
  switch (args.action) {
    case 'create': {
      const contexts = await loadContexts();
      const newContext = createContext({
        category: args.category,
        title: args.title,
        description: args.description,
        priority: args.priority ?? 5,
        tags: args.tags ?? [],
      });
      contexts.push(newContext);
      await saveContexts(contexts);
      return `プロジェクト文脈を作成しました。\nID: ${newContext.id}\nタイトル: ${newContext.title}`;
    }
    case 'read': {
      // フィルタが指定されている場合
      if (
        args.category ||
        args.tags ||
        args.minPriority !== undefined ||
        args.maxPriority !== undefined
      ) {
        const filtered = await filterContexts({
          category: args.category,
          tags: args.tags,
          minPriority: args.minPriority,
          maxPriority: args.maxPriority,
        });
        if (filtered.length === 0) {
          return 'フィルタ条件に一致するプロジェクト文脈が見つかりませんでした。';
        }
        return `フィルタ結果（${filtered.length}件）:\n\n${JSON.stringify(filtered, null, 2)}`;
      }

      // フィルタなしの場合は全件取得
      const contexts = await loadContexts();
      if (contexts.length === 0) {
        return 'プロジェクト文脈が登録されていません。';
      }
      return `登録済みプロジェクト文脈（${contexts.length}件）:\n\n${JSON.stringify(contexts, null, 2)}`;
    }
    case 'update': {
      const updates: Partial<Omit<typeof args, 'action' | 'id'>> = {};
      if (args.category !== undefined) updates.category = args.category;
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.tags !== undefined) updates.tags = args.tags;

      const success = await updateContext(args.id, updates);
      if (!success) {
        return `エラー: ID「${args.id}」のプロジェクト文脈が見つかりませんでした。`;
      }
      return `プロジェクト文脈を更新しました。\nID: ${args.id}`;
    }
    case 'delete': {
      const success = await deleteContext(args.id);
      if (!success) {
        return `エラー: ID「${args.id}」のプロジェクト文脈が見つかりませんでした。`;
      }
      return `プロジェクト文脈を削除しました。\nID: ${args.id}`;
    }
    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
