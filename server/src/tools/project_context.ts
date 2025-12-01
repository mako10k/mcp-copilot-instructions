import {
  loadContexts,
  saveContexts,
  createContext,
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
}

type ProjectContextArgs = CreateContextArgs | ReadContextArgs;

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
      const contexts = await loadContexts();
      if (contexts.length === 0) {
        return 'プロジェクト文脈が登録されていません。';
      }
      return `登録済みプロジェクト文脈（${contexts.length}件）:\n\n${JSON.stringify(contexts, null, 2)}`;
    }
    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
