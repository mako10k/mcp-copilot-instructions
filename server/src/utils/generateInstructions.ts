import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { calculateHash } from '../utils/fileSystem';

/**
 * 開発コンテキスト（文脈・状態）
 */
export interface DevelopmentContext {
  phase: 'development' | 'refactoring' | 'testing' | 'debugging' | 'documentation';
  focus: string[];  // 現在のフォーカス（例: ["API認証", "JWT"]）
  priority: 'high' | 'medium' | 'low';
  mode: 'normal' | 'strict' | 'experimental';
}

/**
 * Markdownファイルのフロントマター
 */
interface InstructionMetadata {
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  required?: boolean;
  criticalFeedback?: boolean;
  copilotEssential?: boolean;
  phases: string[];
}

/**
 * パースされた指示ファイル
 */
interface ParsedInstruction {
  filePath: string;
  metadata: InstructionMetadata;
  content: string;
}

/**
 * スコアリングルール
 */
interface ScoringRules {
  focusKeywordMatch: number;
  tagMatch: number;
  phaseMatch: number;
  filePathMatch: number;
  priorityHigh: number;
  priorityMedium: number;
  priorityLow: number;
  required: number;
  criticalFeedback: number;
  copilotEssential: number;
}

/**
 * スコアリングルールを読み込む
 */
async function loadScoringRules(): Promise<ScoringRules> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const rulesPath = path.join(workspaceRoot, '.copilot-state/scoring-rules.json');
  
  try {
    const content = await fs.readFile(rulesPath, 'utf-8');
    const data = JSON.parse(content);
    return data.rules;
  } catch {
    // デフォルト値
    return {
      focusKeywordMatch: 10,
      tagMatch: 5,
      phaseMatch: 8,
      filePathMatch: 7,
      priorityHigh: 3,
      priorityMedium: 1,
      priorityLow: 0,
      required: 1000,
      criticalFeedback: 500,
      copilotEssential: 300,
    };
  }
}

/**
 * .copilot-instructions/ 内のすべてのMarkdownファイルを読み込む
 */
async function loadAllInstructions(): Promise<ParsedInstruction[]> {
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const instructionsDir = path.join(workspaceRoot, '.copilot-instructions');
  
  const instructions: ParsedInstruction[] = [];
  
  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const parsed = matter(content);
          
          instructions.push({
            filePath: fullPath,
            metadata: parsed.data as InstructionMetadata,
            content: parsed.content,
          });
        } catch (error) {
          console.warn(`Failed to parse ${fullPath}:`, error);
        }
      }
    }
  }
  
  try {
    await scanDirectory(instructionsDir);
  } catch (error) {
    console.error('Failed to load instructions:', error);
  }
  
  return instructions;
}

/**
 * 指示のスコアを計算
 */
function calculateRelevanceScore(
  instruction: ParsedInstruction,
  context: DevelopmentContext,
  rules: ScoringRules
): number {
  let score = 0;
  const { metadata } = instruction;
  
  // 特殊フラグ（最優先）
  if (metadata.required) score += rules.required;
  if (metadata.criticalFeedback) score += rules.criticalFeedback;
  if (metadata.copilotEssential) score += rules.copilotEssential;
  
  // フェーズマッチ
  if (metadata.phases && metadata.phases.includes(context.phase)) {
    score += rules.phaseMatch;
  }
  
  // フォーカスキーワードマッチ
  for (const focusItem of context.focus) {
    const lowerFocus = focusItem.toLowerCase();
    
    // タグマッチ
    if (metadata.tags && metadata.tags.some(tag => tag.toLowerCase().includes(lowerFocus))) {
      score += rules.tagMatch;
    }
    
    // ファイルパスマッチ
    if (instruction.filePath.toLowerCase().includes(lowerFocus)) {
      score += rules.filePathMatch;
    }
    
    // コンテンツマッチ（キーワードが本文に含まれる）
    if (instruction.content.toLowerCase().includes(lowerFocus)) {
      score += rules.focusKeywordMatch;
    }
  }
  
  // 優先度による加算
  if (metadata.priority === 'high') score += rules.priorityHigh;
  if (metadata.priority === 'medium') score += rules.priorityMedium;
  if (metadata.priority === 'low') score += rules.priorityLow;
  
  return score;
}

/**
 * 関連する指示を選択
 */
async function selectRelevantInstructions(
  context: DevelopmentContext
): Promise<ParsedInstruction[]> {
  const rules = await loadScoringRules();
  const allInstructions = await loadAllInstructions();
  
  // 必須指示を先に抽出
  const required = allInstructions.filter(inst => inst.metadata.required === true);
  const optional = allInstructions.filter(inst => !inst.metadata.required);
  
  // 任意指示をスコアリング
  const scored = optional.map(instruction => ({
    instruction,
    score: calculateRelevanceScore(instruction, context, rules),
  }));
  
  // スコア順にソート
  scored.sort((a, b) => b.score - a.score);
  
  // 上限: maxSections (デフォルト10)
  const maxSections = 10;
  const optionalSelected = scored
    .filter(s => s.score > 3)  // 閾値
    .slice(0, maxSections - required.length)
    .map(s => s.instruction);
  
  return [...required, ...optionalSelected];
}

/**
 * .github/copilot-instructions.md を生成
 */
export async function generateInstructions(context: DevelopmentContext): Promise<{
  success: boolean;
  sectionsCount: number;
  generatedHash: string;
}> {
  const selectedInstructions = await selectRelevantInstructions(context);
  
  // Markdownを生成
  let markdown = `# Copilot Instructions\n\n`;
  markdown += `<!-- Auto-generated by mcp-copilot-instructions -->\n`;
  markdown += `<!-- Context: phase=${context.phase}, focus=${context.focus.join(', ')} -->\n`;
  markdown += `<!-- Generated: ${new Date().toISOString()} -->\n\n`;
  
  for (const instruction of selectedInstructions) {
    const category = instruction.metadata.category;
    const relativePath = path.relative(
      path.resolve(__dirname, '../../../.copilot-instructions'),
      instruction.filePath
    );
    
    markdown += `## ${category}: ${relativePath}\n\n`;
    markdown += `${instruction.content}\n\n`;
    markdown += `---\n\n`;
  }
  
  // .github/copilot-instructions.md に書き込み
  const workspaceRoot = path.resolve(__dirname, '../../../');
  const outputPath = path.join(workspaceRoot, '.github/copilot-instructions.md');
  
  await fs.writeFile(outputPath, markdown, 'utf-8');
  
  const hash = calculateHash(markdown);
  
  return {
    success: true,
    sectionsCount: selectedInstructions.length,
    generatedHash: hash,
  };
}
