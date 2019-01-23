import {Resource} from "rdf-object";
import {Util} from "../../Util";
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
                                  cachePath?: string): Promise<TestCaseSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    return new TestCaseSyntax(testCaseData, this.expectNoError,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body),
      this.normalizeUrl(resource.property.action.value));
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
      await parser.parse(this.data, this.baseIRI, injectArguments);
    } catch (e) {
      if (this.expectNoError) {
        throw new Error(`Expected not throw an error when parsing.
  Input: ${this.data}
  Error: ${e}
`);
      }
      return;
    }
    if (!this.expectNoError) {
      throw new Error(`Expected to throw an error when parsing.
  Input: ${this.data}
`);
    }
  }

}
