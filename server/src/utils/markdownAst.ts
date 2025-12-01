import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { Root, Heading, Content } from 'mdast';
import { toString } from 'mdast-util-to-string';
import * as crypto from 'crypto';
import {
  readInstructionsFile,
  writeInstructionsFile,
} from './fileSystem.js';

export interface Section {
  level: number;
  heading: string;
  content: string;
  contentHash?: string;  // セクション内容のハッシュ
  startLine?: number;
  endLine?: number;
}

export interface ConflictMarker {
  heading: string;
  headContent: string;
  mcpContent: string;
  timestamp?: string;
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
 * 文字列のSHA-256ハッシュを計算
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * ASTからセクション構造を抽出（ハッシュ付き）
 */
export function extractSections(ast: Root): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const node of ast.children) {
    if (node.type === 'heading') {
      // 前のセクションを保存
      if (currentSection) {
        currentSection.contentHash = calculateHash(currentSection.content);
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
    currentSection.contentHash = calculateHash(currentSection.content);
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
 * セクションを追加または更新（競合マーカー方式）
 * 
 * @param heading セクション見出し
 * @param newContent 新しいセクション内容
 * @param expectedHash 期待されるセクションのハッシュ値（省略時は競合チェックなし）
 * @param initialSnapshot 初期状態のスナップショット（内部使用）
 */
export async function updateSection(
  heading: string,
  newContent: string,
  expectedHash?: string,
  initialSnapshot?: string
): Promise<{ success: boolean; conflict?: string; autoMerged?: boolean }> {
  // 初期状態を読み込み（スナップショットがあればそれを使用）
  const initialContent = initialSnapshot || await readInstructionsFile();
  if (!initialContent) {
    throw new Error('指示書ファイルが存在しません');
  }

  const initialSections = extractSections(parseMarkdown(initialContent));
  const initialTargetSection = initialSections.find(s => s.heading === heading);
  const newContentHash = calculateHash(newContent.trim());

  // 内容が同じなら更新不要
  if (initialTargetSection) {
    const initialHash = calculateHash(initialTargetSection.content.trim());
    if (initialHash === newContentHash) {
      return { success: true };
    }
    
    // expectedHashが指定されている場合、競合チェック
    if (expectedHash && initialHash !== expectedHash) {
      // 外部変更を検出 - 競合マーカーを挿入
      return await insertConflictMarkersManually(
        heading,
        initialTargetSection.content.trim(),
        newContent.trim()
      ).then(result => ({
        success: result.success,
        conflict: `競合を検出しました。セクション「${heading}」に外部変更があります。競合マーカーを挿入しました。`,
        autoMerged: false
      }));
    }
  }

  // 書き込み直前に再度チェック（外部変更検出）
  const currentContent = await readInstructionsFile();
  if (currentContent && currentContent !== initialContent) {
    const currentSections = extractSections(parseMarkdown(currentContent));
    const currentTargetSection = currentSections.find(s => s.heading === heading);

    if (initialTargetSection && currentTargetSection) {
      const initialHash = calculateHash(initialTargetSection.content.trim());
      const currentHash = calculateHash(currentTargetSection.content.trim());

      // 同じセクションが外部で変更された場合 → 競合マーカー挿入
      if (initialHash !== currentHash) {
        return await insertConflictMarkersManually(
          heading,
          currentTargetSection.content.trim(),
          newContent.trim()
        ).then(result => ({
          success: result.success,
          conflict: `競合を検出しました。セクション「${heading}」に外部変更があります。競合マーカーを挿入しました。`,
          autoMerged: false
        }));
      }
    }

    // 別のセクションが変更された場合 → 自動マージ
    // この場合は通常の更新を継続して autoMerged フラグを返す
  }

  // 通常の更新処理
  const ast = parseMarkdown(currentContent || initialContent);
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
    // 新規セクション追加
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

  const autoMerged = currentContent !== initialContent;
  return { 
    success: true, 
    autoMerged: autoMerged || undefined 
  };
}

/**
 * 競合マーカーを手動で挿入（テスト/デバッグ用）
 * Markdownパーサーを使わず直接テキスト操作で挿入（フォーマット保持のため）
 */
export async function insertConflictMarkersManually(
  heading: string,
  headContent: string,
  mcpContent: string
): Promise<{ success: boolean; conflict?: string }> {
  const content = await readInstructionsFile();
  if (!content) {
    return { success: false, conflict: '指示書ファイルが存在しません' };
  }

  const timestamp = new Date().toISOString();
  
  // セクションの開始と終了を検出
  const headingPattern = new RegExp(`^## ${heading}$`, 'm');
  const match = content.match(headingPattern);
  
  if (!match || match.index === undefined) {
    return { success: false, conflict: `セクション「${heading}」が見つかりません` };
  }

  const sectionStart = match.index + match[0].length;
  
  // 次のセクション（##で始まる行）を探す
  const remainingContent = content.substring(sectionStart);
  const nextHeadingMatch = remainingContent.match(/\n## /);
  const sectionEnd = nextHeadingMatch && nextHeadingMatch.index !== undefined
    ? sectionStart + nextHeadingMatch.index 
    : content.length;

  // 競合マーカーを挿入
  const conflictMarker = `
<<<<<<< HEAD (外部変更: ${timestamp})
${headContent.trim()}
=======
${mcpContent.trim()}
>>>>>>> MCP Update (Copilot)
`;

  const newContent = 
    content.substring(0, sectionStart) +
    conflictMarker +
    content.substring(sectionEnd);

  await writeInstructionsFile(newContent);

  return {
    success: true,
    conflict: `競合マーカーを挿入しました。セクション「${heading}」`
  };
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

/**
 * 競合マーカーを検出
 */
export async function detectConflictMarkers(): Promise<ConflictMarker[]> {
  const content = await readInstructionsFile();
  if (!content) {
    return [];
  }

  const conflicts: ConflictMarker[] = [];
  const lines = content.split('\n');
  let currentHeading = '';
  let inConflict = false;
  let headContent: string[] = [];
  let mcpContent: string[] = [];
  let conflictTimestamp: string | undefined;
  let inHeadSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 見出しを追跡
    if (line.startsWith('#')) {
      currentHeading = line.replace(/^#+\s*/, '');
    }

    // 競合マーカーの検出
    if (line.startsWith('<<<<<<<')) {
      inConflict = true;
      inHeadSection = true;
      headContent = [];
      mcpContent = [];
      // タイムスタンプ抽出
      const match = line.match(/\(外部変更: (.+?)\)/);
      conflictTimestamp = match ? match[1] : undefined;
    } else if (line.startsWith('=======') && inConflict) {
      inHeadSection = false;
    } else if (line.startsWith('>>>>>>>') && inConflict) {
      inConflict = false;
      conflicts.push({
        heading: currentHeading,
        headContent: headContent.join('\n'),
        mcpContent: mcpContent.join('\n'),
        timestamp: conflictTimestamp,
      });
    } else if (inConflict) {
      if (inHeadSection) {
        headContent.push(line);
      } else {
        mcpContent.push(line);
      }
    }
  }

  return conflicts;
}

/**
 * 競合を解決
 */
export async function resolveConflict(
  heading: string,
  resolution: 'use-head' | 'use-mcp' | 'manual',
  manualContent?: string
): Promise<{ success: boolean; error?: string }> {
  const content = await readInstructionsFile();
  if (!content) {
    return { success: false, error: '指示書ファイルが存在しません' };
  }

  const conflicts = await detectConflictMarkers();
  const targetConflict = conflicts.find(c => c.heading === heading);

  if (!targetConflict) {
    return { success: false, error: `セクション「${heading}」に競合が見つかりません` };
  }

  // 解決内容を決定
  let resolvedContent: string;
  switch (resolution) {
    case 'use-head':
      resolvedContent = targetConflict.headContent;
      break;
    case 'use-mcp':
      resolvedContent = targetConflict.mcpContent;
      break;
    case 'manual':
      if (!manualContent) {
        return { success: false, error: 'manual解決時はmanualContentが必須です' };
      }
      resolvedContent = manualContent;
      break;
  }

  // 競合マーカーを削除して解決内容に置き換え（テキストベースで処理）
  const headingPattern = new RegExp(`^## ${heading}$`, 'm');
  const headingMatch = content.match(headingPattern);
  
  if (!headingMatch || headingMatch.index === undefined) {
    return { success: false, error: `セクション「${heading}」が見つかりません` };
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  
  // 次のセクション（##で始まる行）を探す
  const remainingContent = content.substring(sectionStart);
  const nextHeadingMatch = remainingContent.match(/\n## /);
  const sectionEnd = nextHeadingMatch && nextHeadingMatch.index !== undefined
    ? sectionStart + nextHeadingMatch.index 
    : content.length;

  // 競合マーカーを解決内容で置き換え
  const newContent = 
    content.substring(0, sectionStart) +
    '\n' + resolvedContent.trim() + '\n' +
    content.substring(sectionEnd);

  await writeInstructionsFile(newContent);

  return { success: true };
}

/**
 * セクションを削除
 * @param heading 削除するセクションの見出し
 * @returns 成功時はsuccess: true、失敗時はエラーメッセージ
 */
export async function deleteSection(heading: string): Promise<{ success: boolean; error?: string }> {
  const content = await readInstructionsFile();
  if (!content) {
    return { success: false, error: '指示書ファイルが存在しません' };
  }

  // セクションの見出しを検索
  const headingPattern = new RegExp(`^## ${heading}$`, 'm');
  const headingMatch = content.match(headingPattern);
  
  if (!headingMatch || headingMatch.index === undefined) {
    return { success: false, error: `セクション「${heading}」が見つかりません` };
  }

  const sectionStart = headingMatch.index;
  
  // 次のセクション（##で始まる行）を探す
  const remainingContent = content.substring(sectionStart);
  const nextHeadingMatch = remainingContent.match(/\n## /);
  const sectionEnd = nextHeadingMatch && nextHeadingMatch.index !== undefined
    ? sectionStart + nextHeadingMatch.index 
    : content.length;

  // セクションを削除
  const newContent = 
    content.substring(0, sectionStart) +
    content.substring(sectionEnd);

  await writeInstructionsFile(newContent);

  return { success: true };
}

/**
 * セクションを挿入
 * @param heading 新しいセクションの見出し
 * @param content セクションの内容
 * @param position 挿入位置（'before' | 'after' | 'first' | 'last'）
 * @param anchor 基準となるセクションの見出し（before/afterの場合に必須）
 * @returns 成功時はsuccess: true、失敗時はエラーメッセージ
 */
export async function insertSection(
  heading: string,
  content: string,
  position: 'before' | 'after' | 'first' | 'last',
  anchor?: string
): Promise<{ success: boolean; error?: string }> {
  const currentContent = await readInstructionsFile();
  if (!currentContent) {
    return { success: false, error: '指示書ファイルが存在しません' };
  }

  // 既に同じ見出しのセクションが存在するかチェック
  const existingPattern = new RegExp(`^## ${heading}$`, 'm');
  if (existingPattern.test(currentContent)) {
    return { success: false, error: `セクション「${heading}」は既に存在します` };
  }

  // 新しいセクションのテキスト
  const newSection = `## ${heading}\n\n${content.trim()}\n\n`;

  let insertIndex: number;

  switch (position) {
    case 'first': {
      // ファイルの先頭に挿入（タイトルの後）
      // "# Copilot Instructions" などのタイトル行の後を探す
      const titleMatch = currentContent.match(/^#[^#].*$/m);
      insertIndex = titleMatch && titleMatch.index !== undefined
        ? titleMatch.index + titleMatch[0].length + 1
        : 0;
      break;
    }

    case 'last': {
      // ファイルの最後に挿入
      insertIndex = currentContent.length;
      break;
    }

    case 'before':
    case 'after': {
      if (!anchor) {
        return { success: false, error: `position='${position}'の場合はanchorが必須です` };
      }

      // アンカーセクションを検索
      const anchorPattern = new RegExp(`^## ${anchor}$`, 'm');
      const anchorMatch = currentContent.match(anchorPattern);
      
      if (!anchorMatch || anchorMatch.index === undefined) {
        return { success: false, error: `アンカーセクション「${anchor}」が見つかりません` };
      }

      if (position === 'before') {
        // アンカーの直前に挿入
        insertIndex = anchorMatch.index;
      } else {
        // アンカーの直後に挿入（アンカーセクションの終わりを探す）
        const sectionStart = anchorMatch.index;
        const remainingContent = currentContent.substring(sectionStart);
        const nextHeadingMatch = remainingContent.match(/\n## /);
        
        insertIndex = nextHeadingMatch && nextHeadingMatch.index !== undefined
          ? sectionStart + nextHeadingMatch.index + 1
          : currentContent.length;
      }
      break;
    }

    default:
      return { success: false, error: `無効なposition: ${position}` };
  }

  // セクションを挿入
  const newContent = 
    currentContent.substring(0, insertIndex) +
    newSection +
    currentContent.substring(insertIndex);

  await writeInstructionsFile(newContent);

  return { success: true };
}

