/**
 * MCP Resources Implementation
 * Exposes instruction content as readable resources
 */

import { readInstructionsFile } from '../utils/fileSystem.js';
import { 
  readCurrentContext as readContextFromStorage,
  readHierarchy,
} from '../utils/goalStorage.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Get all available resources
 */
export function getAvailableResources(): ResourceDefinition[] {
  return [
    {
      uri: 'instructions://active',
      name: 'Active Instructions',
      description: 'Currently active instructions based on context (phase, focus, priority)',
      mimeType: 'text/markdown',
    },
    {
      uri: 'instructions://goals/hierarchy',
      name: 'Goal Dependency Graph',
      description: 'Current goal hierarchy with dependencies and progress',
      mimeType: 'application/json',
    },
    {
      uri: 'instructions://goals/current',
      name: 'Current Active Goal',
      description: 'The goal currently being worked on with its context',
      mimeType: 'application/json',
    },
    {
      uri: 'instructions://context/current',
      name: 'Current Context State',
      description: 'Active development context (phase, focus, priority, mode)',
      mimeType: 'application/json',
    },
    {
      uri: 'instructions://category/conventions',
      name: 'Conventions Category',
      description: 'All coding convention instructions',
      mimeType: 'text/markdown',
    },
    {
      uri: 'instructions://category/patterns',
      name: 'Patterns Category',
      description: 'All design pattern instructions',
      mimeType: 'text/markdown',
    },
    {
      uri: 'instructions://category/architecture',
      name: 'Architecture Category',
      description: 'All architecture guideline instructions',
      mimeType: 'text/markdown',
    },
    {
      uri: 'instructions://category/phases',
      name: 'Phases Category',
      description: 'All phase-specific workflow instructions',
      mimeType: 'text/markdown',
    },
    {
      uri: 'instructions://category/tools',
      name: 'Tools Category',
      description: 'All tool usage instructions',
      mimeType: 'text/markdown',
    },
  ];
}

/**
 * Read resource content by URI
 */
export async function readResource(uri: string): Promise<{
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}> {
  if (uri === 'instructions://active') {
    return await readActiveInstructions();
  } else if (uri === 'instructions://goals/hierarchy') {
    return await readGoalHierarchy();
  } else if (uri === 'instructions://goals/current') {
    return await readCurrentGoal();
  } else if (uri === 'instructions://context/current') {
    return await readCurrentContext();
  } else if (uri.startsWith('instructions://category/')) {
    const category = uri.replace('instructions://category/', '');
    return await readCategoryInstructions(category);
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

/**
 * Read active instructions (generated copilot-instructions.md)
 */
async function readActiveInstructions(): Promise<{
  uri: string;
  mimeType: string;
  text: string;
}> {
  try {
    const content = await readInstructionsFile();
    return {
      uri: 'instructions://active',
      mimeType: 'text/markdown',
      text: content || '# No Active Instructions\n\nInstructions file is empty.',
    };
  } catch {
    return {
      uri: 'instructions://active',
      mimeType: 'text/markdown',
      text: '# No Active Instructions\n\nInstructions have not been generated yet. Use the `change_context` tool to initialize context and generate instructions.',
    };
  }
}

/**
 * Read goal hierarchy as JSON
 */
async function readGoalHierarchy(): Promise<{
  uri: string;
  mimeType: string;
  text: string;
}> {
  try {
    const hierarchy = await readHierarchy();
    
    if (!hierarchy) {
      return {
        uri: 'instructions://goals/hierarchy',
        mimeType: 'application/json',
        text: JSON.stringify({ message: 'No goals defined yet' }, null, 2),
      };
    }
    
    return {
      uri: 'instructions://goals/hierarchy',
      mimeType: 'application/json',
      text: JSON.stringify(hierarchy, null, 2),
    };
  } catch {
    return {
      uri: 'instructions://goals/hierarchy',
      mimeType: 'application/json',
      text: JSON.stringify({ error: 'Failed to read goal hierarchy' }, null, 2),
    };
  }
}

/**
 * Read current active goal
 */
async function readCurrentGoal(): Promise<{
  uri: string;
  mimeType: string;
  text: string;
}> {
  try {
    const hierarchy = await readHierarchy();
    
    if (!hierarchy) {
      return {
        uri: 'instructions://goals/current',
        mimeType: 'application/json',
        text: JSON.stringify({ message: 'No goals defined yet' }, null, 2),
      };
    }

    // Find goal in progress
    const goalEntries = Object.entries(hierarchy.goals);
    const currentGoalEntry = goalEntries.find(([, goal]: [string, any]) => goal.status === 'in-progress');
    
    if (!currentGoalEntry) {
      return {
        uri: 'instructions://goals/current',
        mimeType: 'application/json',
        text: JSON.stringify({ message: 'No goal currently in progress' }, null, 2),
      };
    }

    return {
      uri: 'instructions://goals/current',
      mimeType: 'application/json',
      text: JSON.stringify(currentGoalEntry[1], null, 2),
    };
  } catch {
    return {
      uri: 'instructions://goals/current',
      mimeType: 'application/json',
      text: JSON.stringify({ error: 'Failed to read current goal' }, null, 2),
    };
  }
}

/**
 * Read current context state
 */
async function readCurrentContext(): Promise<{
  uri: string;
  mimeType: string;
  text: string;
}> {
  try {
    const context = await readContextFromStorage();
    return {
      uri: 'instructions://context/current',
      mimeType: 'application/json',
      text: JSON.stringify(context, null, 2),
    };
  } catch {
    return {
      uri: 'instructions://context/current',
      mimeType: 'application/json',
      text: JSON.stringify({
        phase: 'development',
        focus: [],
        priority: 'medium',
        mode: 'normal',
        message: 'Using default context',
      }, null, 2),
    };
  }
}

/**
 * Read all instructions from a category
 */
async function readCategoryInstructions(category: string): Promise<{
  uri: string;
  mimeType: string;
  text: string;
}> {
  const workspaceRoot = process.cwd();
  const categoryPath = path.join(workspaceRoot, category);

  try {
    const files = await fs.readdir(categoryPath);
    const markdownFiles = files.filter(f => f.endsWith('.md'));

    if (markdownFiles.length === 0) {
      return {
        uri: `instructions://category/${category}`,
        mimeType: 'text/markdown',
        text: `# ${category.charAt(0).toUpperCase() + category.slice(1)} Category\n\nNo instruction files found in this category.`,
      };
    }

    let aggregatedContent = `# ${category.charAt(0).toUpperCase() + category.slice(1)} Category\n\n`;
    aggregatedContent += `**Files**: ${markdownFiles.length}\n`;
    aggregatedContent += `**Generated**: ${new Date().toISOString()}\n\n`;
    aggregatedContent += '---\n\n';

    for (const file of markdownFiles.sort()) {
      const filePath = path.join(categoryPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      aggregatedContent += `## File: \`${category}/${file}\`\n\n`;
      aggregatedContent += content;
      aggregatedContent += '\n\n---\n\n';
    }

    return {
      uri: `instructions://category/${category}`,
      mimeType: 'text/markdown',
      text: aggregatedContent,
    };
  } catch {
    return {
      uri: `instructions://category/${category}`,
      mimeType: 'text/markdown',
      text: `# ${category.charAt(0).toUpperCase() + category.slice(1)} Category\n\n**Error**: Category not found or inaccessible.\n\nMake sure the \`${category}/\` directory exists in your workspace.`,
    };
  }
}
