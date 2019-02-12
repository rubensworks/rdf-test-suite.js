import {Resource} from "rdf-object";
import {ITestCaseData} from "../../ITestCase";
import {TestCaseSyntax, TestCaseSyntaxHandler} from "../TestCaseSyntax";
import {TestCaseJsonLdToRdfHandler} from "./TestCaseJsonLdToRdf";

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
                            cachePath?: string): Promise<TestCaseSyntax> {
    return TestCaseJsonLdToRdfHandler.wrap(super.resourceToTestCase.bind(this), resource, testCaseData, cachePath);
  }

  protected normalizeUrl(url: string) {
    return url;
  }

}
