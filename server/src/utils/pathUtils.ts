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
 * Get workspace root (user's working directory)
 *
 * For MCP server running as npm package, the workspace root is where the user
 * invokes the command (process.cwd()), NOT where the package is installed.
 *
 * The importMetaUrl parameter is kept for backward compatibility but not used
 * in production. It's only used in tests when we need to resolve relative to
 * the test file location.
 */
export function getWorkspaceRoot(importMetaUrl?: string): string {
  // In production (npm package), always use process.cwd()
  // This is the directory where the user runs the MCP server
  if (process.env.NODE_ENV !== 'test') {
    return process.cwd();
  }

  // In test mode, use the old logic to resolve relative to test files
  if (!importMetaUrl) {
    return process.cwd();
  }

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

  // Fallback
  return process.cwd();
}
