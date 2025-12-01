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
 * Assumes source files are in server/src/ or server/dist/
 */
export function getWorkspaceRoot(importMetaUrl: string): string {
  const dirname = getDirname(importMetaUrl);
  // From src/ or dist/, go up to server/, then up to workspace root
  return path.resolve(dirname, '../../../');
}
