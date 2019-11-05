import {Resource} from "rdf-object";
import {IFetchOptions} from "../../../Util";
import {ITestCaseData} from "../../ITestCase";
import {TestCaseSyntax, TestCaseSyntaxHandler} from "../TestCaseSyntax";
import {TestCaseJsonLdToRdfHandler} from "./TestCaseJsonLdToRdf";

/**
 * Test case handler for:
 * * https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest
 */
export class TestCaseJsonLdToRdfNegativeHandler extends TestCaseSyntaxHandler {

  constructor() {
    super(false);
  }

  public resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                            options?: IFetchOptions): Promise<TestCaseJsonLdToRdfHandlerNegative> {
    return TestCaseJsonLdToRdfHandler.wrap(super.resourceToTestCase.bind(this), resource, testCaseData, options);
  }

  protected normalizeUrl(url: string) {
    return url;
  }

  protected getTestCaseClass(): any {
    return TestCaseJsonLdToRdfHandlerNegative;
  }

}

export class TestCaseJsonLdToRdfHandlerNegative extends TestCaseSyntax {

  public readonly expectErrorCode: string;

  constructor(testCaseData: ITestCaseData, expectError: boolean, data: string, baseIRI: string) {
    super(testCaseData, expectError, data, baseIRI);
    if (!this.expectErrorCode) {
      throw new Error('Invalid test case definition, no expected error code was defined.');
    }
  }

  public validateError(error: Error, injectArguments: any) {
    if ((<any> error).code !== this.expectErrorCode) {
      throw new Error('Received invalid error code, expected ' + this.expectErrorCode
        + ', but got ' + (<any> error).code + ' (' + error.message + ')');
    }
  }

}
