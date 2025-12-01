/**
 * Integration test for change_context tool
 */

import { changeContext } from '../../src/tools/change_context.js';
import { createLogger } from '../helpers/test-logger.js';
import { createTestContext, verifyInstructionsGenerated } from '../helpers/test-setup.js';

export async function testChangeContext(): Promise<void> {
  const logger = createLogger('Change Context Tool');
  logger.start();

  const ctx = await createTestContext();

  try {
    // Step 1: Read current state
    logger.step(1, 'Read current state');
    const readResult = await changeContext({ action: 'read' });
    logger.info(readResult);

    // Step 2: Switch to development phase
    logger.step(2, 'Switch to development phase (focus: API authentication)');
    const updateResult = await changeContext({
      action: 'update',
      state: {
        phase: 'development',
        focus: ['API authentication', 'JWT', 'Security'],
        priority: 'high',
        mode: 'normal',
      },
    });
    logger.info(updateResult);

    // Step 3: Verify instructions generated
    logger.step(3, 'Verify generated instructions');
    const verification = await verifyInstructionsGenerated(ctx);
    if (verification.exists) {
      logger.success(`Instructions generated with ${verification.lines} lines`);
      logger.info('Preview (first 20 lines):');
      verification.preview?.forEach((line) => console.log(line));
    } else {
      logger.error('Instructions file not found');
    }

    // Step 4: Switch to refactoring phase
    logger.step(4, 'Switch to refactoring phase');
    const refactorResult = await changeContext({
      action: 'update',
      state: {
        phase: 'refactoring',
        focus: ['Code quality', 'Performance'],
        priority: 'medium',
      },
    });
    logger.info(refactorResult);

    // Step 5: Check history
    logger.step(5, 'List change history');
    const historyResult = await changeContext({ action: 'list-history', limit: 5 });
    logger.info(historyResult);

    // Step 6: Reset to default
    logger.step(6, 'Reset to default state');
    const resetResult = await changeContext({ action: 'reset' });
    logger.info(resetResult);

    logger.success('All context change operations completed successfully');
  } catch (error) {
    logger.error(`Test failed: ${error}`);
    throw error;
  } finally {
    logger.end();
  }
}
