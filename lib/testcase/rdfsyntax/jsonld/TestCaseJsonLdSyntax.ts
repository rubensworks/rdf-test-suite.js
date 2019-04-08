import {Resource} from "rdf-object";
import {ITestCaseData} from "../../ITestCase";
import {TestCaseSyntax, TestCaseSyntaxHandler} from "../TestCaseSyntax";
import {TestCaseJsonLdToRdfHandler} from "./TestCaseJsonLdToRdf";
import {IFetchOptions} from "../../../Util";

/**
 * Test case handler for:
 * * https://json-ld.org/test-suite/vocab#NegativeEvaluationTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#PositiveSyntaxTest
 */
export class TestCaseJsonLdSyntaxHandler extends TestCaseSyntaxHandler {

  constructor(expectNoError: boolean) {
    super(expectNoError);
  }

  public resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                            options?: IFetchOptions): Promise<TestCaseSyntax> {
    return TestCaseJsonLdToRdfHandler.wrap(super.resourceToTestCase.bind(this), resource, testCaseData, options);
  }

  protected normalizeUrl(url: string) {
    return url;
  }

}
