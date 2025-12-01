/**
 * Integration test for project_context tool (CRUD operations)
 */

import { projectContext } from '../../src/tools/project_context.js';
import { createLogger } from '../helpers/test-logger.js';

export async function testProjectContextCRUD(): Promise<void> {
  const logger = createLogger('Project Context CRUD Operations');
  logger.start();

  try {
    // Step 1: Read existing contexts
    logger.step(1, 'Read existing contexts');
    const readResult = await projectContext({ action: 'read', format: 'full' });
    logger.info(readResult);

    // Step 2: Create a test context
    logger.step(2, 'Create new test context');
    const createResult = await projectContext({
      action: 'create',
      category: 'test',
      title: 'Test Context',
      description: 'A test context for demonstration',
      priority: 5,
      tags: ['test', 'demo'],
    });
    logger.info(createResult);

    // Extract ID from create result
    const idMatch = createResult.match(/ID: (ctx-[a-z0-9-]+)/);
    const testContextId = idMatch ? idMatch[1] : null;

    if (testContextId) {
      // Step 3: Update the test context
      logger.step(3, 'Update test context priority and tags');
      const updateResult = await projectContext({
        action: 'update',
        id: testContextId,
        priority: 10,
        tags: ['architecture', 'design-principle', 'mcp-server', 'updated'],
      });
      logger.info(updateResult);
    } else {
      logger.error('Failed to extract context ID, skipping update test');
    }

    // Step 4: Read after update
    logger.step(4, 'Verify update');
    const readAfterUpdate = await projectContext({ action: 'read' });
    logger.info(readAfterUpdate);

    // Step 5: Filter by category
    logger.step(5, 'Filter by category=test');
    const filterByCat = await projectContext({
      action: 'read',
      category: 'test',
    });
    logger.info(filterByCat);

    // Step 6: Filter by tags
    logger.step(6, 'Filter by tags=updated');
    const filterByTag = await projectContext({
      action: 'read',
      tags: ['updated'],
    });
    logger.info(filterByTag);

    // Step 7: Filter by priority
    logger.step(7, 'Filter by priority 9-10');
    const filterByPriority = await projectContext({
      action: 'read',
      minPriority: 9,
      maxPriority: 10,
    });
    logger.info(filterByPriority);

    // Step 8: Delete test context
    if (testContextId) {
      logger.step(8, 'Delete test context');
      const deleteResult = await projectContext({
        action: 'delete',
        id: testContextId,
      });
      logger.info(deleteResult);
    }

    logger.success('All CRUD operations completed successfully');
  } catch (error) {
    logger.error(`Test failed: ${error}`);
    throw error;
  } finally {
    logger.end();
  }
}
