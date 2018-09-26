import {Resource} from "rdf-object";
import {ITestCase, ITestCaseData} from "./ITestCase";
import {ITestCaseHandler} from "./ITestCaseHandler";

/**
 * A fallback test case handler that constructs unsupported test cases.
 */
export class TestCaseUnsupportedHandler implements ITestCaseHandler<TestCaseUnsupported> {

  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData): Promise<TestCaseUnsupported> {
    return new TestCaseUnsupported(this.name, testCaseData);
  }
}

export class TestCaseUnsupported implements ITestCase<any> {
  public readonly type = "unsupported";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly testCaseName: string;

  constructor(testCaseName: string, testCaseData: ITestCaseData) {
    this.testCaseName = testCaseName;
    Object.assign(this, testCaseData);
  }

  public async test(engine: any): Promise<void> {
    throw new Error(`Unsupported test case ${this.testCaseName}`);
  }

}
