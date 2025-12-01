import {
  readInstructionsSections,
  updateSection,
  detectConflictMarkers,
  resolveConflict,
  deleteSection,
  insertSection,
} from '../utils/markdownAst.js';
import { readInstructionsFileWithState } from '../utils/fileSystem.js';
import { withLock } from '../utils/lockManager.js';
import { isRestrictedMode } from '../utils/onboardingStatusManager.js';

interface ReadStructureArgs {
  action: 'read';
  includeGitInfo?: boolean;
}

interface UpdateStructureArgs {
  action: 'update';
  heading: string;
  content: string;
}

interface DetectConflictsArgs {
  action: 'detect-conflicts';
}

interface ResolveConflictArgs {
  action: 'resolve-conflict';
  heading: string;
  resolution: 'use-head' | 'use-mcp' | 'manual';
  manualContent?: string;
}

interface DeleteStructureArgs {
  action: 'delete';
  heading: string;
}

interface InsertStructureArgs {
  action: 'insert';
  heading: string;
  content: string;
  position: 'before' | 'after' | 'first' | 'last';
  anchor?: string;
}

type InstructionsStructureArgs =
  | ReadStructureArgs
  | UpdateStructureArgs
  | DetectConflictsArgs
  | ResolveConflictArgs
  | DeleteStructureArgs
  | InsertStructureArgs;

export async function instructionsStructure(args: InstructionsStructureArgs) {
  // Check for restricted mode (allow read and detect-conflicts)
  if (args.action !== 'read' && args.action !== 'detect-conflicts') {
    const restricted = await isRestrictedMode();
    if (restricted) {
      return (
        '❗ Restricted Mode: This action is not available.\n\n' +
        'Please complete onboarding or use in read-only mode.\n\n' +
        '[Check Details]\n' +
        'onboarding({ action: "status" })\n\n' +
        '[Onboarding]\n' +
        'onboarding({ action: "analyze" })'
      );
    }
  }

  switch (args.action) {
    case 'read': {
      const sections = await readInstructionsSections();
      if (sections.length === 0) {
        return 'Instructions file does not exist or has no sections.';
      }

      let result = '';

      // If including Git information
      if (args.includeGitInfo) {
        const fileState = await readInstructionsFileWithState();
        if (fileState) {
          result += '📊 File State:\n';
          result += `  • SHA-256: ${fileState.state.hash.substring(0, 16)}...\n`;
          result += `  • Size: ${fileState.content.length} bytes\n`;

          if (fileState.state.isGitManaged) {
            result += `  • Git managed: ✓\n`;
            result += `  • Commit: ${fileState.state.gitCommit?.substring(0, 8)}...\n`;
            result += `  • Status: ${fileState.state.gitStatus}\n`;

            if (fileState.state.gitStatus === 'modified') {
              result += `  ⚠️ Uncommitted changes detected\n`;
            }
          } else {
            result += `  • Git managed: ✗\n`;
          }
          result += '\n';
        }
      }

      const summary = sections
        .map(
          (s, i) =>
            `${i + 1}. ${'#'.repeat(s.level)} ${s.heading} (${s.content.length} chars)`,
        )
        .join('\n');
      result += `Instructions section structure (${sections.length} sections total):\n\n${summary}`;

      return result;
    }

    case 'update': {
      try {
        // Use locking for section update
        const result = await withLock(async () => {
          return await updateSection(args.heading, args.content);
        });

        if (result.autoMerged) {
          return `✓ Section "${args.heading}" updated (auto-merged changes from other sections).`;
        }

        if (!result.success && result.conflict) {
          return `⚠️ ${result.conflict}`;
        }

        return `Section "${args.heading}" updated.`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Clear message for lock acquisition failure
        if (message.includes('Failed to acquire lock')) {
          return `❗ Lock acquisition timeout: Another session is updating instructions. Please wait and retry.`;
        }

        return `Error: ${message}`;
      }
    }

    case 'detect-conflicts': {
      try {
        const conflicts = await detectConflictMarkers();
        if (conflicts.length === 0) {
          return 'No conflicts detected.';
        }

        const conflictList = conflicts
          .map((c, i) => `${i + 1}. Section: ${c.heading}`)
          .join('\n');

        return (
          `${conflicts.length} conflicts detected:\n\n${conflictList}\n\n` +
          `To resolve, use action='resolve-conflict'.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error: ${message}`;
      }
    }

    case 'resolve-conflict': {
      try {
        // Use locking for conflict resolution
        const result = await withLock(async () => {
          return await resolveConflict(
            args.heading,
            args.resolution,
            args.manualContent,
          );
        });

        if (!result.success) {
          return `Error: ${result.error}`;
        }

        const resolutionMsg =
          args.resolution === 'use-head'
            ? 'used external changes'
            : args.resolution === 'use-mcp'
              ? 'used Copilot changes'
              : 'manual merge';

        return `✓ Conflict in section "${args.heading}" resolved (${resolutionMsg}).`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error: ${message}`;
      }
    }

    case 'delete': {
      try {
        // Use locking for section deletion
        const result = await withLock(async () => {
          return await deleteSection(args.heading);
        });

        if (!result.success) {
          return `Error: ${result.error}`;
        }

        return `✓ Section "${args.heading}" deleted.`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('Failed to acquire lock')) {
          return `❗ Lock acquisition timeout: Another session is updating instructions. Please wait and retry.`;
        }

        return `Error: ${message}`;
      }
    }

    case 'insert': {
      try {
        // Use locking for section insertion
        const result = await withLock(async () => {
          return await insertSection(
            args.heading,
            args.content,
            args.position,
            args.anchor,
          );
        });

        if (!result.success) {
          return `Error: ${result.error}`;
        }

        const positionMsg =
          args.position === 'first'
            ? 'at the beginning'
            : args.position === 'last'
              ? 'at the end'
              : args.position === 'before'
                ? `before "${args.anchor}"`
                : `after "${args.anchor}"`;

        return `✓ Section "${args.heading}" inserted ${positionMsg}.`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('Failed to acquire lock')) {
          return `❌ Lock acquisition timeout: Another session is updating instructions. Please wait and retry.`;
        }

        return `Error: ${message}`;
      }
    }

    default:
      return `Unknown action: ${(args as any).action}`;
  }
}
