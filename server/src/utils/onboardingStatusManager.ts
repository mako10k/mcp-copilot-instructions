/**
 * onboardingStatusManager.ts
 * Onboarding status management
 *
 * Responsibilities:
 * - Read/write onboarding status
 * - Determine restricted mode
 * - Determine onboarding completion
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const STATUS_DIR = '.copilot-state';
const STATUS_FILE = path.join(STATUS_DIR, 'onboarding.json');

/**
 * Onboarding status
 */
export interface OnboardingStatus {
  version: string; // Schema version
  status:
    | 'not_started' // Not started
    | 'analyzed' // Analyzed
    | 'proposed' // Proposed
    | 'approved' // Approved
    | 'completed' // Completed
    | 'rejected' // Rejected
    | 'skipped'; // Skipped

  pattern?:
    | 'clean' // No instructions
    | 'structured' // Structured (compatible)
    | 'unstructured' // Unstructured
    | 'messy'; // Messy

  analyzedAt?: string; // Analysis timestamp (ISO 8601)
  decidedAt?: string; // User decision timestamp
  migratedAt?: string; // Migration execution timestamp

  problems?: Array<{
    // Detected problems
    type: 'contradiction' | 'duplication' | 'unclear';
    description: string;
    locations: Array<{ line: number; text: string }>;
  }>;

  proposal?: {
    // Migration proposal data (set during 'propose' action)
    title: string;
    summary: string;
    steps: string[];
    risk: 'low' | 'medium' | 'high';
  };

  backupPath?: string; // Backup file path
  canRollback: boolean; // Can rollback
  rollbackUntil?: string; // Rollback deadline

  restrictedMode: boolean; // Restricted mode
}

/**
 * Return initial status
 */
function getInitialStatus(): OnboardingStatus {
  return {
    version: '1.0.0',
    status: 'not_started',
    canRollback: false,
    restrictedMode: false,
  };
}

/**
 * Get onboarding status
 * Returns initial status if file doesn't exist
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const content = await fs.readFile(STATUS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return initial status if file doesn't exist
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return getInitialStatus();
    }
    throw error;
  }
}

/**
 * Save onboarding status
 */
export async function saveOnboardingStatus(
  status: OnboardingStatus,
): Promise<void> {
  // Create directory if it doesn't exist
  await fs.mkdir(STATUS_DIR, { recursive: true });

  // Save status
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

/**
 * Check if in restricted mode
 *
 * Restricted mode conditions:
 * - status is 'analyzed' and pattern is 'unstructured' or 'messy'
 * - status is 'proposed' and not yet approved
 * - status is 'rejected'
 * - .github/copilot-instructions.md exists but onboarding not started (CRITICAL)
 *
 * Not restricted mode conditions:
 * - status is 'not_started' AND no existing .github/copilot-instructions.md
 * - status is 'completed' or 'skipped'
 * - pattern is 'clean' or 'structured'
 */
export async function isRestrictedMode(): Promise<boolean> {
  const status = await getOnboardingStatus();
  
  // If explicit restrictedMode flag is set, honor it
  if (status.restrictedMode) {
    return true;
  }
  
  // CRITICAL: If onboarding not started, check if .github/copilot-instructions.md exists
  if (status.status === 'not_started') {
    try {
      const instructionsPath = path.join(process.cwd(), '.github/copilot-instructions.md');
      await fs.access(instructionsPath);
      // File exists! Must run onboarding first to prevent overwrite
      return true;
    } catch {
      // File doesn't exist, safe to proceed
      return false;
    }
  }
  
  return false;
}

/**
 * Check if onboarding is completed
 *
 * Completion conditions:
 * - status is 'completed' (migration completed)
 * - status is 'skipped' (user chose to skip)
 * - pattern is 'clean' or 'structured' and status is 'analyzed' (compatible)
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  const status = await getOnboardingStatus();

  // Explicit completion state
  if (status.status === 'completed' || status.status === 'skipped') {
    return true;
  }

  // Consider analyzed as completed for compatible patterns
  if (
    status.status === 'analyzed' &&
    (status.pattern === 'clean' || status.pattern === 'structured')
  ) {
    return true;
  }

  return false;
}

/**
 * Skip onboarding (transition to normal mode)
 * Used when user selects "later", etc.
 */
export async function skipOnboarding(): Promise<void> {
  const status = await getOnboardingStatus();

  const newStatus: OnboardingStatus = {
    ...status,
    status: 'skipped',
    decidedAt: new Date().toISOString(),
    restrictedMode: false,
  };

  await saveOnboardingStatus(newStatus);
}

/**
 * Mark onboarding as completed
 * Used when migration succeeds or compatibility is confirmed
 */
export async function completeOnboarding(): Promise<void> {
  const status = await getOnboardingStatus();

  const newStatus: OnboardingStatus = {
    ...status,
    status: 'completed',
    decidedAt: new Date().toISOString(),
    restrictedMode: false,
  };

  await saveOnboardingStatus(newStatus);
}
