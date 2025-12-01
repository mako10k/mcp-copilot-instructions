/**
 * Test runner configuration and utilities
 */

export interface TestSuite {
  name: string;
  description: string;
  category: 'unit' | 'integration';
  run: () => Promise<void>;
}

export interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: Error;
}

export class TestRunner {
  private suites: Map<string, TestSuite> = new Map();
  private results: TestResult[] = [];

  register(suite: TestSuite): void {
    this.suites.set(suite.name, suite);
  }

  async runAll(): Promise<TestResult[]> {
    console.log(`\n${'='.repeat(70)}`);
    console.log('RUNNING ALL TEST SUITES');
    console.log(`${'='.repeat(70)}\n`);

    this.results = [];

    for (const [, suite] of this.suites) {
      const result = await this.runSuite(suite);
      this.results.push(result);
    }

    this.printSummary();
    return this.results;
  }

  async runSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Running: ${suite.name}`);
    console.log(`Category: ${suite.category}`);
    console.log(`Description: ${suite.description}`);
    console.log(`${'─'.repeat(70)}`);

    const startTime = Date.now();
    let passed = true;
    let error: Error | undefined;

    try {
      await suite.run();
      console.log(`✓ ${suite.name} passed`);
    } catch (err) {
      passed = false;
      error = err as Error;
      console.error(`✗ ${suite.name} failed:`, error.message);
    }

    const duration = Date.now() - startTime;

    return {
      suite: suite.name,
      passed,
      duration,
      error,
    };
  }

  async runByName(suiteName: string): Promise<TestResult | null> {
    const suite = this.suites.get(suiteName);
    if (!suite) {
      console.error(`Test suite not found: ${suiteName}`);
      return null;
    }

    return await this.runSuite(suite);
  }

  async runByCategory(category: 'unit' | 'integration'): Promise<TestResult[]> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`RUNNING ${category.toUpperCase()} TESTS`);
    console.log(`${'='.repeat(70)}\n`);

    this.results = [];

    for (const [, suite] of this.suites) {
      if (suite.category === category) {
        const result = await this.runSuite(suite);
        this.results.push(result);
      }
    }

    this.printSummary();
    return this.results;
  }

  listSuites(): void {
    console.log('\nAvailable test suites:\n');
    for (const [name, suite] of this.suites) {
      console.log(`  ${name} [${suite.category}]`);
      console.log(`    ${suite.description}`);
    }
    console.log();
  }

  private printSummary(): void {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.length - passed;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n${'='.repeat(70)}`);
    console.log('TEST SUMMARY');
    console.log(`${'='.repeat(70)}`);
    console.log(`Total: ${this.results.length}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
    console.log(`Duration: ${totalDuration}ms`);
    console.log(`${'='.repeat(70)}\n`);

    if (failed > 0) {
      console.log('Failed tests:');
      for (const result of this.results) {
        if (!result.passed) {
          console.log(`  ✗ ${result.suite}: ${result.error?.message}`);
        }
      }
      console.log();
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  get totalPassed(): number {
    return this.results.filter((r) => r.passed).length;
  }

  get totalFailed(): number {
    return this.results.filter((r) => !r.passed).length;
  }
}

export const runner = new TestRunner();
