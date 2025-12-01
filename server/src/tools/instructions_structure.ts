import {
  readInstructionsSections,
  updateSection,
  detectConflictMarkers,
  resolveConflict,
} from '../utils/markdownAst';

interface ReadStructureArgs {
  action: 'read';
}

interface UpdateStructureArgs {
  action: 'update';
  heading: string;
  content: string;
}

interface DetectConflictsArgs {
  action: 'detect-conflicts';
}

interface ResolveConflictArgs {
  action: 'resolve-conflict';
  heading: string;
  resolution: 'use-head' | 'use-mcp' | 'manual';
  manualContent?: string;
}

type InstructionsStructureArgs =
  | ReadStructureArgs
  | UpdateStructureArgs
  | DetectConflictsArgs
  | ResolveConflictArgs;

export async function instructionsStructure(args: InstructionsStructureArgs) {
  switch (args.action) {
    case 'read': {
      const sections = await readInstructionsSections();
      if (sections.length === 0) {
        return '指示書が存在しないか、セクションがありません。';
      }
      const summary = sections
        .map(
          (s, i) =>
            `${i + 1}. ${'#'.repeat(s.level)} ${s.heading} (${s.content.length}文字)`
        )
        .join('\n');
      return `指示書のセクション構造（全${sections.length}セクション）:\n\n${summary}`;
    }

    case 'update': {
      try {
        const result = await updateSection(args.heading, args.content);

        if (result.autoMerged) {
          return `✓ セクション「${args.heading}」を更新しました（他セクションの変更を自動マージ）。`;
        }

        if (!result.success && result.conflict) {
          return `⚠️ ${result.conflict}`;
        }

        return `セクション「${args.heading}」を更新しました。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }

    case 'detect-conflicts': {
      try {
        const conflicts = await detectConflictMarkers();
        if (conflicts.length === 0) {
          return '競合はありません。';
        }

        const conflictList = conflicts
          .map((c, i) => `${i + 1}. セクション: ${c.heading}`)
          .join('\n');

        return `${conflicts.length}件の競合を検出しました:\n\n${conflictList}\n\n` +
          `解決するには action='resolve-conflict' を使用してください。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }

    case 'resolve-conflict': {
      try {
        const result = await resolveConflict(
          args.heading,
          args.resolution,
          args.manualContent
        );

        if (!result.success) {
          return `エラー: ${result.error}`;
        }

        const resolutionMsg =
          args.resolution === 'use-head'
            ? '外部変更を採用'
            : args.resolution === 'use-mcp'
            ? 'Copilot変更を採用'
            : '手動統合';

        return `✓ セクション「${args.heading}」の競合を解決しました（${resolutionMsg}）。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }

    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
