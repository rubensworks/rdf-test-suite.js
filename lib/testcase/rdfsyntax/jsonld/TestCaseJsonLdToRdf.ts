import {isomorphic} from "rdf-isomorphic";
import * as RDF from "rdf-js";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {Util} from "../../../Util";
import {ITestCaseData} from "../../ITestCase";
import {ITestCaseHandler} from "../../ITestCaseHandler";
import {IParser} from "../IParser";
import {ITestCaseRdfSyntax} from "../ITestCaseRdfSyntax";
// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for https://json-ld.org/test-suite/vocab#ToRDFTest.
 */
export class TestCaseJsonLdToRdfHandler implements ITestCaseHandler<TestCaseJsonLdToRdf> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCaseJsonLdToRdf> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }

    // Loop over the options
    let produceGeneralizedRdf: boolean = false;
    for (const option of resource.properties.jsonLdOptions) {
      // Should generalized RDF should be produced?
      if (option.property.jsonLdProduceGeneralizedRdf) {
        produceGeneralizedRdf = option.property.jsonLdProduceGeneralizedRdf.term.value === 'true';
      }
    }

    try {
      return new TestCaseJsonLdToRdf(testCaseData,
        await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body),
        await arrayifyStream(<any> (await Util.fetchRdf(resource.property.result.value, cachePath, true))[1]),
        Util.normalizeBaseUrl(resource.property.action.value),
        produceGeneralizedRdf);
    } catch (e) {
      console.error(e);
      console.error('Error in ' + resource.value);
      return null;
    }
  }

}

export class TestCaseJsonLdToRdf implements ITestCaseRdfSyntax {
  public readonly type = "rdfsyntax";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly data: string;
  public readonly expected: RDF.Quad[];
  public readonly baseIRI: string;
  public readonly produceGeneralizedRdf: boolean;

  constructor(testCaseData: ITestCaseData, data: string, expected: RDF.Quad[], baseIRI: string,
              produceGeneralizedRdf: boolean) {
    Object.assign(this, testCaseData);
    this.data = data;
    this.expected = expected;
    this.baseIRI = baseIRI;
    this.produceGeneralizedRdf = produceGeneralizedRdf;
  }

  public async test(parser: IParser): Promise<void> {
    const quads: RDF.Quad[] = await parser.parse(this.data, this.baseIRI,
      { produceGeneralizedRdf: this.produceGeneralizedRdf });
    if (!isomorphic(quads, this.expected)) {
      throw new Error(`Invalid data parsing
  Parser input: ${this.data}

  Expected: ${JSON.stringify(this.expected.map(quadToStringQuad), null, '  ')}

  Got: ${JSON.stringify(quads.map(quadToStringQuad), null, '  ')}
`);
    }
  }

}
