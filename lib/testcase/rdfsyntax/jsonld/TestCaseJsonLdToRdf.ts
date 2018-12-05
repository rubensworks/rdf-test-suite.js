import {Resource} from "rdf-object";
import {ITestCaseData} from "../../ITestCase";
import {IParser} from "../IParser";
import {TestCaseEval, TestCaseEvalHandler} from "../TestCaseEval";

/**
 * Test case handler for https://json-ld.org/test-suite/vocab#ToRDFTest.
 */
export class TestCaseJsonLdToRdfHandler extends TestCaseEvalHandler {

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCaseEval> {
    const testCaseEval = await super.resourceToTestCase(resource, testCaseData, cachePath);

    // Loop over the options
    let produceGeneralizedRdf: boolean = false;
    for (const option of resource.properties.jsonLdOptions) {
      // Should generalized RDF should be produced?
      if (option.property.jsonLdProduceGeneralizedRdf) {
        produceGeneralizedRdf = option.property.jsonLdProduceGeneralizedRdf.term.value === 'true';
      }
    }

    // Add produceGeneralizedRdf to the inject arguments
    const testOld = testCaseEval.test;
    testCaseEval.test = (parser: IParser, injectArguments: any) =>
      testOld.bind(testCaseEval)(parser, { produceGeneralizedRdf, ...injectArguments });

    return testCaseEval;
  }

  protected normalizeUrl(url: string) {
    return url;
  }
}
