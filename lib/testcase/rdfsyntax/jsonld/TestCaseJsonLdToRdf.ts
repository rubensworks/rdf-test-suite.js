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

  public static async getOptions(resource: Resource, options?: IFetchOptions)
    : Promise<{ injectArguments: any, testProperties: any }> {
    const injectArguments: any = {
      produceGeneralizedRdf: false,
    };
    const testProperties: any = {};

    // Loop over the options
    for (const option of resource.properties.jsonLdOptions) {
      // Should generalized RDF should be produced?
      if (option.property.jsonLdProduceGeneralizedRdf) {
        injectArguments.produceGeneralizedRdf = option.property.jsonLdProduceGeneralizedRdf.term.value === 'true';
      }

      // Override the default base IRI
      if (option.property.jsonLdBase) {
        injectArguments.baseIRI = option.property.jsonLdBase.term.value;
      }

      // Override the default base IRI
      if (option.property.jsonLdExpandContext) {
        const expandContextUrl = resolve(option.property.jsonLdExpandContext.term.value,
          resource.property.action.value);
        injectArguments.context = JSON.parse(await require('stream-to-string')((
          await Util.fetchCached(expandContextUrl, options)).body));
      }

      // The processing mode
      // If undefined, all processors should be able to handle the test,
      // otherwise, only processors explicitly supporting that mode should run the test.
      if (option.property.processingMode) {
        // Remove the 'json-ld-' prefix from the string
        injectArguments.processingMode = option.property.processingMode.term.value.substr(8);
      }

      // The spec for which this test was defined.
      if (option.property.specVersion) {
        // Remove the 'json-ld-' prefix from the string
        injectArguments.specVersion = option.property.specVersion.term.value.substr(8);
      }

      // The rdfDirection mode for @direction handling
      if (option.property.rdfDirection) {
        injectArguments.rdfDirection = option.property.rdfDirection.term.value;
      }

      // Should native types be used?
      if (option.property.useNativeTypes) {
        injectArguments.useNativeTypes = option.property.useNativeTypes.term.value === 'true';
      }

      // Should RDF type be used?
      if (option.property.useRdfType) {
        injectArguments.useRdfType = option.property.useRdfType.term.value === 'true';
      }
    }

    // An optional root context.
    if (resource.property.context) {
      injectArguments.context = JSON.parse(await require('stream-to-string')((
        await Util.fetchCached(resource.property.context.term.value, options)).body));
    }

    // An optional expected error code
    if (resource.property.expectJsonLdErrorCode) {
      testProperties.expectErrorCode = resource.property.expectJsonLdErrorCode.term.value;
    }

    return { injectArguments, testProperties };
  }

  public static async wrap<H, T extends ITestCase<H>>(superHandler: (resource: Resource, testCaseData: ITestCaseData,
                                                                     options?: IFetchOptions) => Promise<T>,
                                                      resource: Resource, testCaseData: ITestCaseData,
                                                      options?: IFetchOptions): Promise<T> {
    const { injectArguments: injectArgumentsAdditional, testProperties } = await TestCaseJsonLdToRdfHandler
      .getOptions(resource, options);

    // Assign additional test properties
    Object.assign(testCaseData, testProperties);

    // Construct test case
    const testCaseEval = await superHandler(resource, testCaseData, options);

    // Add additional inject arguments
    const testOld = testCaseEval.test;
    testCaseEval.test = (handler: H, injectArguments: any) => testOld.bind(testCaseEval)(handler,
      { ...injectArgumentsAdditional, ...injectArguments });

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
