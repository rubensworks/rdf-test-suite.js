import {Resource} from "rdf-object";
import {Util} from "../../../Util";
import {ITestCase, ITestCaseData} from "../../ITestCase";
import {IParser} from "../IParser";
import {TestCaseEval, TestCaseEvalHandler} from "../TestCaseEval";

/**
 * Test case handler for:
 * * https://json-ld.org/test-suite/vocab#ToRDFTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest
 */
export class TestCaseJsonLdToRdfHandler extends TestCaseEvalHandler {

  public static async wrap<T extends ITestCase<IParser>>(superHandler: (resource: Resource, testCaseData: ITestCaseData,
                                                                        cachePath?: string) => Promise<T>,
                                                         resource: Resource, testCaseData: ITestCaseData,
                                                         cachePath?: string): Promise<T> {
    const testCaseEval = await superHandler(resource, testCaseData, cachePath);

    // Loop over the options
    let produceGeneralizedRdf: boolean = false;
    let processingMode: string = null;
    let specVersion: string = '1.0';
    let context: any;
    for (const option of resource.properties.jsonLdOptions) {
      // Should generalized RDF should be produced?
      if (option.property.jsonLdProduceGeneralizedRdf) {
        produceGeneralizedRdf = option.property.jsonLdProduceGeneralizedRdf.term.value === 'true';
      }

      // The processing mode
      // If undefined, all processors should be able to handle the test,
      // otherwise, only processors explicitly supporting that mode should run the test.
      if (option.property.processingMode) {
        // Remove the 'json-ld-' prefix from the string
        processingMode = option.property.processingMode.term.value.substr(8);
      }

      // The spec for which this test was defined.
      if (option.property.specVersion) {
        // Remove the 'json-ld-' prefix from the string
        specVersion = option.property.specVersion.term.value.substr(8);
      }
    }

    // An optional root context.
    if (resource.property.context) {
      context = JSON.parse(await require('stream-to-string')((
        await Util.fetchCached(resource.property.context.term.value, cachePath)).body));
    }

    // Add produceGeneralizedRdf to the inject arguments
    const testOld = testCaseEval.test;
    testCaseEval.test = (parser: IParser, injectArguments: any) => testOld.bind(testCaseEval)(parser,
      { produceGeneralizedRdf, processingMode, specVersion, context, ...injectArguments });

    return testCaseEval;
  }

  public resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                            cachePath?: string): Promise<TestCaseEval> {
    return TestCaseJsonLdToRdfHandler.wrap(super.resourceToTestCase.bind(this), resource, testCaseData, cachePath);
  }

  protected normalizeUrl(url: string) {
    return url;
  }

}
