/**
 * Test for onboarding with MCP sampling integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setOnboardingServer, onboarding } from '../tools/onboarding.js';
import {
  saveOnboardingStatus,
  OnboardingStatus,
} from '../utils/onboardingStatusManager.js';
import { writeInstructionsFile } from '../utils/fileSystem.js';

/**
 * Mock server with createMessage capability
 */
function createMockServer(): Server {
  const server = new Server(
    { name: 'test-server', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // Mock createMessage to return a simple narrative
  (server as any).createMessage = async (params: any) => {
    const userMessage = params.messages[0]?.content?.text || '';

    if (userMessage.includes('analyzing existing Copilot instructions')) {
      return {
        role: 'assistant',
        content: {
          type: 'text',
          text: '# Analysis Report\n\nPattern detected: structured\nThe instructions are well-organized with clear sections.\nRestricted mode: OFF\nNext steps: Ready to use.',
        },
        model: 'test-model',
        stopReason: 'endTurn',
      };
    }

    if (userMessage.includes('migration proposal')) {
      return {
        role: 'assistant',
        content: {
          type: 'text',
          text: '# Migration Proposal\n\nTitle: Safe Migration\nSummary: Your instructions will be preserved.\nRisk: Low\nNext: Approve and migrate safely.',
        },
        model: 'test-model',
        stopReason: 'endTurn',
      };
    }

    return {
      role: 'assistant',
      content: { type: 'text', text: 'Generic response' },
      model: 'test-model',
      stopReason: 'endTurn',
    };
  };

  return server;
}

/**
 * Test analyze with sampling
 */
export async function testAnalyzeWithSampling(): Promise<void> {
  console.log('Testing analyze with MCP sampling...');

  // Setup: Create mock structured instructions
  await writeInstructionsFile(
    '## Section 1\nContent\n\n## Section 2\nMore content',
  );

  // Reset onboarding status
  const initialStatus: OnboardingStatus = {
    version: '1.0.0',
    status: 'not_started',
    restrictedMode: false,
    canRollback: false,
  };
  await saveOnboardingStatus(initialStatus);

  // Set up mock server
  const mockServer = createMockServer();
  setOnboardingServer(mockServer);

  // Execute analyze
  const result = await onboarding({ action: 'analyze' });

  // Verify sampling was used (should contain narrative text)
  if (
    !result.includes('Analysis Report') &&
    !result.includes('Pattern detected')
  ) {
    throw new Error('Expected sampling-generated narrative in analyze result');
  }

  console.log('✓ Analyze with sampling test passed');
  console.log('Sample output:', result.substring(0, 200));
}

/**
 * Test propose with sampling
 */
export async function testProposeWithSampling(): Promise<void> {
  console.log('Testing propose with MCP sampling...');

  // Setup: Create unstructured instructions
  await writeInstructionsFile(
    'Some unstructured text without sections.\nMore content here.',
  );

  // Set analyzed status
  const analyzedStatus: OnboardingStatus = {
    version: '1.0.0',
    status: 'analyzed',
    pattern: 'unstructured',
    restrictedMode: true,
    analyzedAt: new Date().toISOString(),
    canRollback: false,
  };
  await saveOnboardingStatus(analyzedStatus);

  // Set up mock server
  const mockServer = createMockServer();
  setOnboardingServer(mockServer);

  // Execute propose
  const result = await onboarding({ action: 'propose' });

  // Verify sampling was used
  if (!result.includes('Migration Proposal') && !result.includes('Title:')) {
    throw new Error('Expected sampling-generated narrative in propose result');
  }

  console.log('✓ Propose with sampling test passed');
  console.log('Sample output:', result.substring(0, 200));
}

/**
 * Test fallback when sampling fails
 */
export async function testSamplingFallback(): Promise<void> {
  console.log('Testing fallback when sampling fails...');

  // Setup
  await writeInstructionsFile('## Clean Section\nContent');

  const initialStatus: OnboardingStatus = {
    version: '1.0.0',
    status: 'not_started',
    restrictedMode: false,
    canRollback: false,
  };
  await saveOnboardingStatus(initialStatus);

  // Set up failing mock server
  const failingServer = new Server(
    { name: 'failing-server', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  (failingServer as any).createMessage = async () => {
    throw new Error('Sampling intentionally failed');
  };

  setOnboardingServer(failingServer);

  // Execute analyze (should fallback to formatted output)
  const result = await onboarding({ action: 'analyze' });

  // Verify fallback output format (should contain emoji and structured sections)
  if (!result.includes('Analysis Results') && !result.includes('Pattern:')) {
    throw new Error('Expected fallback formatted output');
  }

  console.log('✓ Sampling fallback test passed');
  console.log('Fallback output:', result.substring(0, 200));
}

/**
 * Run all sampling tests
 */
export async function runSamplingTests(): Promise<void> {
  console.log('=== Onboarding Sampling Integration Tests ===\n');

  try {
    await testAnalyzeWithSampling();
    console.log();

    await testProposeWithSampling();
    console.log();

    await testSamplingFallback();
    console.log();

    console.log('=== All sampling tests passed ===');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}
