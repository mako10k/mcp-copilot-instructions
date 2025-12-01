import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Root, Heading, Content } from 'mdast';
import { toString } from 'mdast-util-to-string';
import {
  readInstructionsFile,
  writeInstructionsFile,
  readInstructionsFileWithState,
  writeInstructionsFileWithConflictCheck,
  FileState,
} from './fileSystem';

export interface Section {
  level: number;
  heading: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

/**
 * Markdownテキストを解析してASTを取得
 */
export function parseMarkdown(markdown: string): Root {
  const processor = unified().use(remarkParse);
  return processor.parse(markdown) as Root;
}

/**
 * ASTをMarkdownテキストに変換
 */
export function stringifyMarkdown(ast: Root): string {
  const processor = unified().use(remarkStringify, {
    bullet: '-',
    emphasis: '_',
    strong: '*',
    fences: true,
  });
  return processor.stringify(ast);
}

/**
 * ASTからセクション構造を抽出
 */
export function extractSections(ast: Root): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const node of ast.children) {
    if (node.type === 'heading') {
      // 前のセクションを保存
      if (currentSection) {
        sections.push(currentSection);
      }
      // 新しいセクションを開始
      currentSection = {
        level: (node as Heading).depth,
        heading: toString(node),
        content: '',
      };
    } else if (currentSection) {
      // 現在のセクションにコンテンツを追加
      const nodeText = stringifyNode(node);
      currentSection.content += nodeText + '\n';
    }
  }

  // 最後のセクションを保存
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * 単一ノードを文字列に変換
 */
function stringifyNode(node: Content): string {
  const tempAst: Root = {
    type: 'root',
    children: [node],
  };
  return stringifyMarkdown(tempAst).trim();
}

/**
 * 指示書ファイルを読み込んでセクション構造を取得
 */
export async function readInstructionsSections(): Promise<Section[]> {
  const content = await readInstructionsFile();
  if (!content) {
    return [];
  }
  const ast = parseMarkdown(content);
  return extractSections(ast);
}

/**
 * セクションを追加または更新（競合チェック付き）
 */
export async function updateSection(
  heading: string,
  newContent: string
): Promise<{ success: boolean; conflict?: string }> {
  // ファイル状態付きで読み込み
  const result = await readInstructionsFileWithState();
  if (!result) {
    throw new Error('指示書ファイルが存在しません');
  }

  const { content, state } = result;
  const ast = parseMarkdown(content);
  let found = false;

  // 既存のセクションを検索
  for (let i = 0; i < ast.children.length; i++) {
    const node = ast.children[i];
    if (node.type === 'heading' && toString(node) === heading) {
      found = true;
      // セクションの内容を更新（次の見出しまで）
      const nextHeadingIndex = ast.children.findIndex(
        (n, idx) => idx > i && n.type === 'heading'
      );
      const endIndex = nextHeadingIndex === -1 ? ast.children.length : nextHeadingIndex;

      // 新しいコンテンツをパース
      const newAst = parseMarkdown(newContent);
      // 見出しの次から置き換え
      ast.children.splice(i + 1, endIndex - i - 1, ...newAst.children);
      break;
    }
  }

  if (!found) {
    // セクションが見つからない場合は末尾に追加
    const headingNode: Heading = {
      type: 'heading',
      depth: 2,
      children: [{ type: 'text', value: heading }],
    };
    const newAst = parseMarkdown(newContent);
    ast.children.push(headingNode, ...newAst.children);
  }

  const updatedMarkdown = stringifyMarkdown(ast);

  // 競合チェック付きで書き込み
  const writeResult = await writeInstructionsFileWithConflictCheck(
    updatedMarkdown,
    state
  );

  if (!writeResult.success && writeResult.conflict) {
    return {
      success: false,
      conflict: `${writeResult.conflict.message}\n\n` +
        `期待ハッシュ: ${writeResult.conflict.expectedHash.substring(0, 8)}...\n` +
        `現在ハッシュ: ${writeResult.conflict.currentHash.substring(0, 8)}...\n\n` +
        `ファイルを再読み込みしてから再試行してください。`,
    };
  }

  return { success: true };
}

/**
 * セクションを追加または更新（従来版、後方互換性のため残す）
 * @deprecated updateSection を使用してください（競合チェック付き）
 */
export async function updateSectionLegacy(
  heading: string,
  newContent: string
): Promise<void> {
  const content = await readInstructionsFile();
  if (!content) {
    throw new Error('指示書ファイルが存在しません');
  }

  const ast = parseMarkdown(content);
  let found = false;

  for (let i = 0; i < ast.children.length; i++) {
    const node = ast.children[i];
    if (node.type === 'heading' && toString(node) === heading) {
      found = true;
      const nextHeadingIndex = ast.children.findIndex(
        (n, idx) => idx > i && n.type === 'heading'
      );
      const endIndex = nextHeadingIndex === -1 ? ast.children.length : nextHeadingIndex;

      const newAst = parseMarkdown(newContent);
      ast.children.splice(i + 1, endIndex - i - 1, ...newAst.children);
      break;
    }
  }

  if (!found) {
    const headingNode: Heading = {
      type: 'heading',
      depth: 2,
      children: [{ type: 'text', value: heading }],
    };
    const newAst = parseMarkdown(newContent);
    ast.children.push(headingNode, ...newAst.children);
  }

  const updatedMarkdown = stringifyMarkdown(ast);
  await writeInstructionsFile(updatedMarkdown);
}
