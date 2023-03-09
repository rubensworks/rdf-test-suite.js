import {isomorphic} from "rdf-isomorphic";
import * as RDF from "@rdfjs/types";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {ErrorTest} from "../../ErrorTest";
import {IFetchOptions, Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IParser} from "./IParser";
import {ITestCaseRdfSyntax} from "./ITestCaseRdfSyntax";
import arrayifyStream from "arrayify-stream";

// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for testing if two RDF serialization are isomorphic.
 */
export class TestCaseEvalHandler implements ITestCaseHandler<TestCaseEval> {
  private shouldNormalizeUrl: boolean;

  constructor(options?: { normalizeUrl?: boolean }) {
    this.shouldNormalizeUrl = options?.normalizeUrl === true;
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  options?: IFetchOptions): Promise<TestCaseEval> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    return new TestCaseEval(testCaseData,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, options)).body),
      await arrayifyStream(<any> (await Util.fetchRdf(resource.property.result.value,
        {...options, normalizeUrl: true}))[1]),
      this.normalizeUrl(resource.property.action.value));
  }

  protected normalizeUrl(url: string) {
    return this.shouldNormalizeUrl ? Util.normalizeBaseUrl(url) : url;
  }
}

export class TestCaseEval implements ITestCaseRdfSyntax {
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

  constructor(testCaseData: ITestCaseData, data: string, expected: RDF.Quad[], baseIRI: string) {
    Object.assign(this, testCaseData);
    this.data = data;
    this.expected = expected;
    this.baseIRI = baseIRI;
  }

  public async test(parser: IParser, injectArguments: any): Promise<void> {
    const quads: RDF.Quad[] = await parser.parse(this.data, this.baseIRI, injectArguments);
    if (!isomorphic(quads, this.expected)) {
      throw new ErrorTest(`Invalid data parsing
  Input: ${this.data}

  Expected: ${JSON.stringify(this.expected.map(quadToStringQuad), null, '  ')}

  Got: ${JSON.stringify(quads.map(quadToStringQuad), null, '  ')}
`);
    }
  }

}
