import { readInstructionsSections, updateSection } from '../utils/markdownAst';

interface ReadStructureArgs {
  action: 'read';
}

interface UpdateStructureArgs {
  action: 'update';
  heading: string;
  content: string;
}

type InstructionsStructureArgs = ReadStructureArgs | UpdateStructureArgs;

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
        await updateSection(args.heading, args.content);
        return `セクション「${args.heading}」を更新しました。`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `エラー: ${message}`;
      }
    }
    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
