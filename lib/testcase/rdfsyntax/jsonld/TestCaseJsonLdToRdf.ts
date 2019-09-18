import {Resource} from "rdf-object";
import {resolve} from "relative-to-absolute-iri";
import {IFetchOptions, Util} from "../../../Util";
import {ITestCase, ITestCaseData} from "../../ITestCase";
import {IParser} from "../IParser";
import {TestCaseEval, TestCaseEvalHandler} from "../TestCaseEval";

/**
 * Test case handler for:
 * * https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest
 */
export class TestCaseJsonLdToRdfHandler extends TestCaseEvalHandler {

  public static async wrap<T extends ITestCase<IParser>>(superHandler: (resource: Resource, testCaseData: ITestCaseData,
                                                                        options?: IFetchOptions) => Promise<T>,
                                                         resource: Resource, testCaseData: ITestCaseData,
                                                         options?: IFetchOptions): Promise<T> {
    const testCaseEval = await superHandler(resource, testCaseData, options);

    // Loop over the options
    const additionalOptions: any = {
      produceGeneralizedRdf: false,
      specVersion: '1.0',
    };
    for (const option of resource.properties.jsonLdOptions) {
      // Should generalized RDF should be produced?
      if (option.property.jsonLdProduceGeneralizedRdf) {
        additionalOptions.produceGeneralizedRdf = option.property.jsonLdProduceGeneralizedRdf.term.value === 'true';
      }

      // Override the default base IRI
      if (option.property.jsonLdBase) {
        additionalOptions.baseIRI = option.property.jsonLdBase.term.value;
      }

      // Override the default base IRI
      if (option.property.jsonLdExpandContext) {
        const expandContextUrl = resolve(option.property.jsonLdExpandContext.term.value,
          resource.property.action.value);
        additionalOptions.context = JSON.parse(await require('stream-to-string')((
          await Util.fetchCached(expandContextUrl, options)).body));
      }

      // The processing mode
      // If undefined, all processors should be able to handle the test,
      // otherwise, only processors explicitly supporting that mode should run the test.
      if (option.property.processingMode) {
        // Remove the 'json-ld-' prefix from the string
        additionalOptions.processingMode = option.property.processingMode.term.value.substr(8);
      }

      // The spec for which this test was defined.
      if (option.property.specVersion) {
        // Remove the 'json-ld-' prefix from the string
        additionalOptions.specVersion = option.property.specVersion.term.value.substr(8);
      }
    }

    // An optional root context.
    if (resource.property.context) {
      additionalOptions.context = JSON.parse(await require('stream-to-string')((
        await Util.fetchCached(resource.property.context.term.value, options)).body));
    }

    // Add produceGeneralizedRdf to the inject arguments
    const testOld = testCaseEval.test;
    testCaseEval.test = (parser: IParser, injectArguments: any) => testOld.bind(testCaseEval)(parser,
      { ...additionalOptions, ...injectArguments });

    return testCaseEval;
  }

  public resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                            options?: IFetchOptions): Promise<TestCaseEval> {
    return TestCaseJsonLdToRdfHandler.wrap(super.resourceToTestCase.bind(this), resource, testCaseData, options);
  }

  protected normalizeUrl(url: string) {
    return url;
  }

}
