/**
 * Common test setup and cleanup utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspaceRoot } from '../../src/utils/pathUtils.js';

export interface TestContext {
  workspaceRoot: string;
  instructionsDir: string;
  stateDir: string;
  instructionsPath: string;
}

export async function createTestContext(): Promise<TestContext> {
  const workspaceRoot = getWorkspaceRoot(import.meta.url);
  const instructionsDir = path.join(workspaceRoot, '.copilot-instructions');
  const stateDir = path.join(workspaceRoot, '.copilot-state');
  const instructionsPath = path.join(
    workspaceRoot,
    '.github/copilot-instructions.md',
  );

  return {
    workspaceRoot,
    instructionsDir,
    stateDir,
    instructionsPath,
  };
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

export async function cleanupTestData(): Promise<void> {
  // Only cleanup if explicitly needed - usually we want to keep test data
  // This is here as a utility if tests need cleanup
}

export async function verifyInstructionsGenerated(ctx: TestContext): Promise<{
  exists: boolean;
  lines?: number;
  preview?: string[];
}> {
  const exists = await fileExists(ctx.instructionsPath);

  if (!exists) {
    return { exists: false };
  }

  const content = await readFile(ctx.instructionsPath);
  const lines = content.split('\n');

  return {
    exists: true,
    lines: lines.length,
    preview: lines.slice(0, 20),
  };
}
