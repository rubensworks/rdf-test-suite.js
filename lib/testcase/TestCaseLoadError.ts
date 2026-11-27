import type { ITestCase, ITestCaseData } from './ITestCase';

/**
 * A test case that could not be loaded, for instance because one of its files could not be fetched.
 * It fails with the error that occurred while loading it, so that it is not left out of the results.
 */
export class TestCaseLoadError implements ITestCase<any> {
  public readonly type = 'loaderror';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly error: Error;

  constructor(testCaseData: ITestCaseData, error: Error) {
    this.error = error;
    Object.assign(this, testCaseData);
  }

  public async test(_engine: any): Promise<void> {
    throw this.error;
  }
}
