import {isomorphic} from "rdf-isomorphic";
import * as RDF from "rdf-js";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IParser} from "./IParser";
import {ITestCaseRdfSyntax} from "./ITestCaseRdfSyntax";
// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for testing if two RDF serialization are isomorphic.
 */
export class TestCaseEvalHandler implements ITestCaseHandler<TestCaseEval> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCaseEval> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    return new TestCaseEval(testCaseData,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body),
      await arrayifyStream(<any> (await Util.fetchRdf(resource.property.result.value, cachePath, true))[1]),
      Util.normalizeBaseUrl(resource.property.action.value));
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

  public async test(parser: IParser): Promise<void> {
    const quads: RDF.Quad[] = await parser.parse(this.data, this.baseIRI, {});
    if (!isomorphic(quads, this.expected)) {
      throw new Error(`Invalid data parsing
  Query: ${this.data}

  Expected: ${JSON.stringify(this.expected.map(quadToStringQuad), null, '  ')}

  Got: ${JSON.stringify(quads.map(quadToStringQuad), null, '  ')}
`);
    }
  }

}
