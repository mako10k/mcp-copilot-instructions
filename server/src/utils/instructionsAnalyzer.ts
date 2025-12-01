/**
 * instructionsAnalyzer.ts
 * 既存指示書の分析ロジック
 * 
 * 責務:
 * - 指示書の存在確認
 * - パターン分類（clean/structured/unstructured/messy）
 * - 問題検出（矛盾・重複）
 * - セクション提案（非構造化コンテンツ向け）
 */

import { readInstructionsFile } from './fileSystem';

/**
 * 分析結果
 */
export interface AnalysisResult {
  exists: boolean;
  pattern: 'clean' | 'structured' | 'unstructured' | 'messy';
  
  structured?: {
    sections: Array<{ 
      heading: string; 
      lineCount: number; 
      startLine: number;
      content: string;
    }>;
    compatible: boolean;
  };
  
  unstructured?: {
    contentLength: number;
    lineCount: number;
    suggestedSections: Array<{
      heading: string;
      content: string;
      confidence: number; // 0-1
    }>;
  };
  
  problems?: Array<{
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;
  
  recommendation: string;
}

/**
 * セクション情報
 */
interface Section {
  heading: string;
  lines: string[];
  startLine: number;
  content: string;
}

/**
 * 既存指示書を分析
 */
export async function analyzeInstructions(): Promise<AnalysisResult> {
  const content = await readInstructionsFile();
  
  // パターン1: 指示書が存在しない（クリーン）
  if (!content) {
    return {
      exists: false,
      pattern: 'clean',
      recommendation: '新規作成できます。そのまま利用を開始してください。'
    };
  }
  
  const lines = content.split('\n');
  
  // まず問題検出（パターン2,4共通で必要）
  const problems = detectProblems(content, lines);
  
  // パターン2 or 4: 構造化済み（## セクション形式）
  const sections = extractSections(content);
  if (sections.length > 0) {
    // 問題がある場合はパターン4（messy）
    if (problems.length > 0) {
      return {
        exists: true,
        pattern: 'messy',
        problems,
        structured: {
          sections: sections.map(s => ({
            heading: s.heading,
            lineCount: s.lines.length,
            startLine: s.startLine,
            content: s.content
          })),
          compatible: false
        },
        recommendation: '矛盾や重複が検出されました。手動での整理をお勧めします。'
      };
    }
    
    // 問題がない場合はパターン2（structured）
    return {
      exists: true,
      pattern: 'structured',
      structured: {
        sections: sections.map(s => ({
          heading: s.heading,
          lineCount: s.lines.length,
          startLine: s.startLine,
          content: s.content
        })),
        compatible: true
      },
      recommendation: '既存の指示書を検出しました。そのまま利用できます。'
    };
  }
  
  // パターン3 or 4: セクションなし
  if (problems.length > 0) {
    // パターン4: めちゃくちゃ（矛盾・重複あり、セクションなし）
    return {
      exists: true,
      pattern: 'messy',
      problems,
      recommendation: '矛盾や重複が検出されました。手動での整理をお勧めします。'
    };
  }
  
  // パターン3: 非構造化（問題はないが整理されていない）
  const suggested = suggestSections(content, lines);
  return {
    exists: true,
    pattern: 'unstructured',
    unstructured: {
      contentLength: content.length,
      lineCount: lines.length,
      suggestedSections: suggested
    },
    recommendation: '構造化することで管理しやすくなります。提案を確認しますか？'
  };
}

/**
 * セクション抽出（## で始まる行）
 * 
 * 構造化済みの指示書から既存セクションを抽出
 */
export function extractSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  
  lines.forEach((line, index) => {
    const match = line.match(/^## (.+)$/);
    if (match) {
      // 前のセクションを保存
      if (currentSection) {
        currentSection.content = currentSection.lines.join('\n').trim();
        sections.push(currentSection);
      }
      // 新しいセクションを開始
      currentSection = {
        heading: match[1].trim(),
        lines: [],
        startLine: index + 1,
        content: ''
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  });
  
  // 最後のセクションを保存
  if (currentSection) {
    currentSection.content = currentSection.lines.join('\n').trim();
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * 問題検出（矛盾・重複）
 * 
 * めちゃくちゃな状態の指示書から問題を検出
 */
export function detectProblems(
  content: string, 
  lines: string[]
): Array<{
  type: 'contradiction' | 'duplication' | 'unclear';
  description: string;
  locations: Array<{ line: number; text: string }>;
}> {
  const problems: Array<{
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }> = [];
  
  // 1. 重複セクション検出
  const headings = new Map<string, number[]>();
  lines.forEach((line, index) => {
    const match = line.match(/^## (.+)$/);
    if (match) {
      const heading = match[1].trim().toLowerCase();
      if (!headings.has(heading)) {
        headings.set(heading, []);
      }
      headings.get(heading)!.push(index + 1);
    }
  });
  
  headings.forEach((lineNumbers, heading) => {
    if (lineNumbers.length > 1) {
      problems.push({
        type: 'duplication',
        description: `重複セクション: "${heading}"`,
        locations: lineNumbers.map(line => ({
          line,
          text: lines[line - 1]
        }))
      });
    }
  });
  
  // 2. 矛盾検出（シンプルなキーワードベース）
  const contradictionPatterns = [
    { 
      positive: /any.*禁止|anyを?使わない|any.*NG|any.*避ける/i, 
      negative: /any.*OK|anyを?使[うえ]|any.*許可|any.*可能/i, 
      term: 'any型の使用' 
    },
    { 
      positive: /camelCase/i, 
      negative: /snake_case/i, 
      term: '命名規則（camelCase vs snake_case）' 
    },
    { 
      positive: /PascalCase/i, 
      negative: /camelCase.*クラス|クラス.*camelCase/i, 
      term: 'クラス命名規則' 
    },
    { 
      positive: /Jest/i, 
      negative: /Vitest/i, 
      term: 'テストフレームワーク（Jest vs Vitest）' 
    },
    { 
      positive: /ESLint/i, 
      negative: /TSLint/i, 
      term: 'リンター（ESLint vs TSLint）' 
    }
  ];
  
  contradictionPatterns.forEach(pattern => {
    const positiveLines: number[] = [];
    const negativeLines: number[] = [];
    
    lines.forEach((line, index) => {
      if (pattern.positive.test(line)) positiveLines.push(index + 1);
      if (pattern.negative.test(line)) negativeLines.push(index + 1);
    });
    
    if (positiveLines.length > 0 && negativeLines.length > 0) {
      problems.push({
        type: 'contradiction',
        description: `矛盾: ${pattern.term}`,
        locations: [
          ...positiveLines.slice(0, 2).map(line => ({ line, text: lines[line - 1] })),
          ...negativeLines.slice(0, 2).map(line => ({ line, text: lines[line - 1] }))
        ]
      });
    }
  });
  
  return problems;
}

/**
 * セクション提案（非構造化コンテンツ向け）
 * 
 * フリーフォーマットの指示書から自然なセクション分けを提案
 * 注: 本格的な実装ではLLM活用が望ましいが、ここではキーワードベースで実装
 */
export function suggestSections(
  content: string,
  lines: string[]
): Array<{
  heading: string;
  content: string;
  confidence: number;
}> {
  const suggestions: Array<{ 
    heading: string; 
    content: string; 
    confidence: number;
  }> = [];
  
  // キーワードベースの分類
  const keywords: Record<string, RegExp> = {
    'TypeScript規約': /typescript|型|type|interface|any|unknown|as const|generics|ジェネリック/i,
    'テストパターン': /test|jest|vitest|spec|coverage|テスト|単体テスト|統合テスト/i,
    '命名規則': /命名|camelCase|snake_case|PascalCase|変数名|関数名|クラス名|定数名/i,
    'コーディング規約': /規約|convention|style|スタイル|フォーマット/i,
    'Linter・Formatter': /eslint|prettier|lint|format|フォーマッター/i,
    'ファイル構成': /ファイル|構成|ディレクトリ|フォルダ|import|インポート順/i,
    'エラーハンドリング': /error|exception|エラー|例外|try.*catch|throw/i,
    'コメント': /comment|コメント|ドキュメント|JSDoc|注釈/i
  };
  
  const contentBySection = new Map<string, string[]>();
  
  // 各行をキーワードで分類
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return; // 空行はスキップ
    
    Object.entries(keywords).forEach(([section, pattern]) => {
      if (pattern.test(line)) {
        if (!contentBySection.has(section)) {
          contentBySection.set(section, []);
        }
        contentBySection.get(section)!.push(line);
      }
    });
  });
  
  // セクションを生成
  contentBySection.forEach((sectionLines, heading) => {
    // 重複行を削除（複数のセクションにマッチした場合）
    const uniqueLines = Array.from(new Set(sectionLines));
    
    // 信頼度の計算（行数と内容の充実度で判定）
    let confidence = 0.5; // 基本信頼度
    confidence += Math.min(0.3, uniqueLines.length * 0.05); // 行数による加算（最大+0.3）
    
    // 具体的なキーワードがあれば信頼度を上げる
    const hasSpecificKeywords = uniqueLines.some(line => 
      /^-|^[0-9]+\.|例:|推奨|禁止|必須/.test(line.trim())
    );
    if (hasSpecificKeywords) {
      confidence += 0.1;
    }
    
    suggestions.push({
      heading,
      content: uniqueLines.join('\n'),
      confidence: Math.min(0.95, confidence) // 最大0.95
    });
  });
  
  // 分類できなかった行は「その他」に
  const categorizedLines = new Set<string>();
  contentBySection.forEach(sectionLines => {
    sectionLines.forEach(line => categorizedLines.add(line));
  });
  
  const uncategorized = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !categorizedLines.has(line);
  });
  
  if (uncategorized.length > 0) {
    // タイトル行（# で始まる）や自動生成コメントは除外
    const filteredUncategorized = uncategorized.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('#') && 
             !trimmed.includes('Auto-generated') &&
             !trimmed.includes('自動生成');
    });
    
    if (filteredUncategorized.length > 0) {
      suggestions.push({
        heading: 'その他',
        content: filteredUncategorized.join('\n'),
        confidence: 0.3 // 低い信頼度
      });
    }
  }
  
  // 信頼度でソート（高い順）
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  return suggestions;
}
