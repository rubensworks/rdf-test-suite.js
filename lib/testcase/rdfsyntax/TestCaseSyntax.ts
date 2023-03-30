import {Resource} from "rdf-object";
import {ErrorTest} from "../../ErrorTest";
import {IFetchOptions, Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IParser} from "./IParser";
import {ITestCaseRdfSyntax} from "./ITestCaseRdfSyntax";
// tslint:disable-next-line:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for checking if a syntax is valid or not.
 */
export class TestCaseSyntaxHandler implements ITestCaseHandler<TestCaseSyntax> {

  private readonly expectNoError: boolean;

  constructor(expectNoError: boolean) {
    this.expectNoError = expectNoError;
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  options?: IFetchOptions): Promise<TestCaseSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    return new (this.getTestCaseClass())(testCaseData, this.expectNoError,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, options)).body),
      this.normalizeUrl(resource.property.action.value));
  }

  protected getTestCaseClass(): any {
    return TestCaseSyntax;
  }

  protected normalizeUrl(url: string) {
    return Util.normalizeBaseUrl(url);
  }

}

export class TestCaseSyntax implements ITestCaseRdfSyntax {
  public readonly type = "rdfsyntax";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly expectNoError: boolean;
  public readonly data: string;
  public readonly baseIRI: string;

  constructor(testCaseData: ITestCaseData, expectError: boolean, data: string, baseIRI: string) {
    Object.assign(this, testCaseData);
    this.expectNoError = expectError;
    this.data = data;
    this.baseIRI = baseIRI;
  }

  public async test(parser: IParser, injectArguments: any): Promise<void> {
    try {
      await parser.parse(this.data, this.baseIRI, injectArguments, this);
    } catch (e) {
      if (e.skipped) {
        throw e;
      }

      if (this.expectNoError) {
        throw new ErrorTest(`Expected not throw an error when parsing.
  Input: ${this.data}
  Error: ${e}
`);
      }

      this.validateError(e, injectArguments);

      return;
    }
    if (!this.expectNoError) {
      throw new ErrorTest(`${this.getErrorMessage()}
  Input: ${this.data}
`);
    }
  }

  public validateError(error: Error, injectArguments: any) {
    // Overridable
  }

  public getErrorMessage() {
    return 'Expected to throw an error when parsing.';
  }
}
