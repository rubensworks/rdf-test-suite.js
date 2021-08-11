import * as RDF from "@rdfjs/types";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {ErrorTest} from "../../../ErrorTest";
import {IFetchOptions, Util} from "../../../Util";
import {ITestCaseData} from "../../ITestCase";
import {ITestCaseHandler} from "../../ITestCaseHandler";
import {ISerializer} from "../ISerializer";
import {ITestCaseFromRdfSyntax} from "../ITestCaseFromRdfSyntax";
import {TestCaseJsonLdFromRdf} from "./TestCaseJsonLdFromRdf";
import {TestCaseJsonLdToRdfHandler} from "./TestCaseJsonLdToRdf";
// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');

/**
 * Test case handler for:
 * * https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest
 * * https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest
 */
export class TestCaseJsonLdFromRdfNegativeHandler implements ITestCaseHandler<TestCaseJsonLdFromRdfHandlerNegative> {

  public async resourceToTestCaseInner(resource: Resource, testCaseData: ITestCaseData,
                                       options?: IFetchOptions): Promise<TestCaseJsonLdFromRdfHandlerNegative> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    return new TestCaseJsonLdFromRdfHandlerNegative(
      testCaseData,
      resource.property.result.value,
      await arrayifyStream(<any> (await Util.fetchRdf(resource.property.action.value,
        {...options, normalizeUrl: true}))[1]),
      resource.property.action.value,
      {...options, normalizeUrl: true},
      );
  }

  public resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                            options?: IFetchOptions): Promise<TestCaseJsonLdFromRdfHandlerNegative> {
    return TestCaseJsonLdToRdfHandler.wrap(this.resourceToTestCaseInner.bind(this), resource, testCaseData, options);
  }

}

export class TestCaseJsonLdFromRdfHandlerNegative implements ITestCaseFromRdfSyntax {
  public readonly type = "fromrdfsyntax";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly data: RDF.Quad[];
  public readonly expectErrorCode: string;
  public readonly baseIRI: string;
  public readonly options: any;

  constructor(testCaseData: ITestCaseData, expectErrorCode: string, data: RDF.Quad[], baseIRI: string, options: any) {
    Object.assign(this, testCaseData);
    this.data = data;
    this.expectErrorCode = expectErrorCode;
    this.baseIRI = baseIRI;
    this.options = options;
  }

  public async test(serializer: ISerializer, injectArguments: any): Promise<void> {
    try {
      await serializer.serialize(this.data, this.baseIRI, {...this.options, ...injectArguments});
    } catch (e) {
      if (e.skipped) {
        throw e;
      }

      this.validateError(e, injectArguments);

      return;
    }
    throw new ErrorTest(`${this.getErrorMessage()}
  Input:
    ${this.data.map((quad) => JSON.stringify(quadToStringQuad(quad))).join(',\n    ')}
`);
  }

  public validateError(error: Error, injectArguments: any) {
    if ((<any> error).code !== this.expectErrorCode) {
      throw new Error('Received invalid error code, expected ' + this.expectErrorCode
        + ', but got ' + (<any> error).code + ' (' + error.message + ')');
    }
  }

  public getErrorMessage() {
    return `Expected to throw an error with code '${this.expectErrorCode}' when parsing.`;
  }

}
