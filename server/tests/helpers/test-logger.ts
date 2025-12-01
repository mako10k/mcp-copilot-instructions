/**
 * Test logging utilities
 */

export class TestLogger {
  private testName: string;
  private startTime: number = 0;

  constructor(testName: string) {
    this.testName = testName;
  }

  start(): void {
    this.startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${this.testName}`);
    console.log(`${'='.repeat(60)}\n`);
  }

  step(stepNumber: number, description: string): void {
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`Step ${stepNumber}: ${description}`);
    console.log(`${'-'.repeat(50)}`);
  }

  success(message: string): void {
    console.log(`✓ ${message}`);
  }

  error(message: string): void {
    console.error(`✗ ${message}`);
  }

  info(message: string): void {
    console.log(`ℹ ${message}`);
  }

  result(result: any): void {
    console.log(JSON.stringify(result, null, 2));
  }

  end(): void {
    const duration = Date.now() - this.startTime;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST COMPLETED: ${this.testName} (${duration}ms)`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

export function createLogger(testName: string): TestLogger {
  return new TestLogger(testName);
}
