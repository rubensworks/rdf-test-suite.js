import * as RDF from "@rdfjs/types";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {IFetchOptions, Util} from "../../../Util";
import {ITestCaseData} from "../../ITestCase";
import {ITestCaseHandler} from "../../ITestCaseHandler";
import {ISerializer} from "../ISerializer";
import {ITestCaseFromRdfSyntax} from "../ITestCaseFromRdfSyntax";
import {TestCaseJsonLdToRdfHandler} from "./TestCaseJsonLdToRdf";
import arrayifyStream from "arrayify-stream";

// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for:
 * * https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest
 *
 * It will check if the serialization from RDF to JSON-LD matches with the expected JSON-LD document.
 */
export class TestCaseJsonLdFromRdfHandler implements ITestCaseHandler<TestCaseJsonLdFromRdf> {

  public async resourceToTestCaseInner(resource: Resource, testCaseData: ITestCaseData,
                                       options?: IFetchOptions): Promise<TestCaseJsonLdFromRdf> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    return new TestCaseJsonLdFromRdf(testCaseData,
      await arrayifyStream(<any> (await Util.fetchRdf(resource.property.action.value,
        {...options, normalizeUrl: true}))[1]),
      await stringifyStream((await Util.fetchCached(resource.property.result.value, options)).body),
      resource.property.action.value, {...options, normalizeUrl: true});
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  options?: IFetchOptions): Promise<TestCaseJsonLdFromRdf> {
    return TestCaseJsonLdToRdfHandler.wrap(this.resourceToTestCaseInner.bind(this), resource, testCaseData, options);
  }

}

export class TestCaseJsonLdFromRdf implements ITestCaseFromRdfSyntax {
  public readonly type = "fromrdfsyntax";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly data: RDF.Quad[];
  public readonly expected: string;
  public readonly baseIRI: string;
  public readonly options: any;

  constructor(testCaseData: ITestCaseData, data: RDF.Quad[], expected: string, baseIRI: string, options: any) {
    Object.assign(this, testCaseData);
    this.data = data;
    this.expected = expected;
    this.baseIRI = baseIRI;
    this.options = options;
  }

  public async test(serializer: ISerializer, injectArguments: any): Promise<void> {
    const serialized: string = await serializer.serialize(this.data, this.baseIRI,
      { ...this.options, ...injectArguments });
    if (!objectsIsomorphic(JSON.parse(serialized), JSON.parse(this.expected))) {
      throw new Error(`Invalid data serialization
  Input:
    ${this.data.map((quad) => JSON.stringify(quadToStringQuad(quad))).join(',\n    ')}

  Expected: ${this.expected}

  Got: ${serialized}
`);
    }
  }

}

// tslint:disable:align
export function objectsIsomorphic(obj1: any, obj2: any, options: IObjectsIsomorphicOptions = {
  ordered: false,
  strictBlankNodes: false,
}, parentKey?: string) {
  if (parentKey !== '@list' && !options.ordered && Array.isArray(obj1) && Array.isArray(obj2)) {
    obj1 = obj1.sort(arraySorter);
    obj2 = obj2.sort(arraySorter);
  }

  // Loop through properties in object 1
  for (const p in obj1) {
    // Check property exists on obj2
    if (!(p in obj2)) {
      return false;
    }

    switch (typeof (obj1[p])) {
    case 'object':
      if (typeof obj2[p] !== 'object' || !objectsIsomorphic(obj1[p], obj2[p], options, p)) {
        return false;
      }
      break;
    case 'string':
      // Don't match blank nodes strictly
      if (!options.strictBlankNodes && obj1[p].startsWith('_:')
        && typeof obj2[p] === 'string' && obj2[p].startsWith('_:')) {
        return true;
      }
    // Compare values
    default:
      if (obj1[p] !== obj2[p]) {
        return false;
      }
    }
  }

  // Check object 2 for any extra properties
  for (const p in obj2) {
    if (!(p in obj1)) {
      return false;
    }
  }
  return true;
}

export function arraySorter(obj1: any, obj2: any): number {
  return JSON.stringify(obj1).localeCompare(JSON.stringify(obj2));
}

export interface IObjectsIsomorphicOptions {
  ordered?: boolean;
  strictBlankNodes?: boolean;
}
