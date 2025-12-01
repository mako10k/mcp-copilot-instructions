import {
  loadContexts,
  saveContexts,
  createContext,
  updateContext,
  deleteContext,
  filterContexts,
} from '../utils/contextStorage.js';

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
  format?: 'summary' | 'full';
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
      return `Project context created.\nID: ${newContext.id}\nTitle: ${newContext.title}`;
    }
    case 'read': {
      // If filters are specified
      let contexts;
      if (
        args.category ||
        args.tags ||
        args.minPriority !== undefined ||
        args.maxPriority !== undefined
      ) {
        contexts = await filterContexts({
          category: args.category,
          tags: args.tags,
          minPriority: args.minPriority,
          maxPriority: args.maxPriority,
        });
        if (contexts.length === 0) {
          return 'No project contexts found matching filter criteria.';
        }
      } else {
        // No filters - fetch all
        contexts = await loadContexts();
        if (contexts.length === 0) {
          return 'No project contexts registered.';
        }
      }

      // Select display format
      const format = args.format || 'summary';
      if (format === 'summary') {
        const header = args.category || args.tags
          ? `Filter results (${contexts.length} items):`
          : `Registered project contexts (${contexts.length} items):`;
        const summary = contexts
          .map(
            (ctx, idx) =>
              `${idx + 1}. [${ctx.category}] ${ctx.title} (priority:${ctx.priority}) #${ctx.tags.join(' #')}\n   ID: ${ctx.id}`
          )
          .join('\n\n');
        return `${header}\n\n${summary}`;
      } else {
        // full format (legacy JSON display)
        const header = args.category || args.tags
          ? `Filter results (${contexts.length} items):`
          : `Registered project contexts (${contexts.length} items):`;
        return `${header}\n\n${JSON.stringify(contexts, null, 2)}`;
      }
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
        return `Error: Project context with ID "${args.id}" not found.`;
      }
      return `Project context updated.\nID: ${args.id}`;
    }
    case 'delete': {
      const success = await deleteContext(args.id);
      if (!success) {
        return `Error: Project context with ID "${args.id}" not found.`;
      }
      return `Project context deleted.\nID: ${args.id}`;
    }
    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
