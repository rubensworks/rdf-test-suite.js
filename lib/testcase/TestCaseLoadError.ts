import type { ITestCase, ITestCaseData } from './ITestCase';

/**
 * A test case that could not be constructed from its manifest entry.
 * Running it fails with the error that occurred while constructing it,
 * or skips it if that error was an {@link ErrorSkipped}.
 */
export class TestCaseLoadError implements ITestCase<any> {
  public readonly type = 'load-error';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly error: Error;

  public constructor(testCaseData: ITestCaseData, error: Error) {
    Object.assign(this, testCaseData);
    this.error = error;
  }

  public async test(_handler: any): Promise<void> {
    throw Object.assign(new Error(`Could not load test case: ${this.error.message}`), {
      skipped: (<{ skipped?: boolean }> this.error).skipped,
    });
  }
}
