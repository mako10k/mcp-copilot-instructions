/**
 * Common path utilities for ESM compatibility
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get __dirname equivalent in ESM
 * Usage: const __dirname = getDirname(import.meta.url);
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * Get workspace root from any source file
 * Assumes source files are in server/src/ or server/dist/src/
 */
export function getWorkspaceRoot(importMetaUrl: string): string {
  const dirname = getDirname(importMetaUrl);
  
  // Detect if we're in dist/src/ or just src/
  if (dirname.includes('/dist/src/')) {
    // From dist/src/tools/ or dist/src/utils/ → go up 4 levels to workspace root
    return path.resolve(dirname, '../../../../');
  } else if (dirname.includes('/src/')) {
    // From src/tools/ or src/utils/ → go up 3 levels to workspace root
    return path.resolve(dirname, '../../../');
  } else if (dirname.includes('/tests/')) {
    // From tests/helpers/ or tests/integration/ → go up 3 levels to workspace root
    return path.resolve(dirname, '../../../');
  } else if (dirname.includes('/dist/tests/')) {
    // From dist/tests/helpers/ → go up 4 levels to workspace root
    return path.resolve(dirname, '../../../../');
  }
  
  // Fallback: try to go up until we find package.json or .git
  let current = dirname;
  for (let i = 0; i < 10; i++) {
    current = path.resolve(current, '..');
    // Check if this looks like workspace root (has .git or is above server/)
    if (current.endsWith('/mcp-copilot-instructions') || path.basename(current) === 'mcp-copilot-instructions') {
      return current;
    }
  }
  
  // Last resort
  return path.resolve(dirname, '../../../../');
}
