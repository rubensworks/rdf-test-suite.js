import {Resource} from "rdf-object";
import {Util} from "../../../Util";
import {ITestCaseData} from "../../ITestCase";
import {ITestCaseHandler} from "../../ITestCaseHandler";
import {IParser} from "../IParser";
import {ITestCaseRdfSyntax} from "../ITestCaseRdfSyntax";
// tslint:disable-next-line:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for http://www.w3.org/ns/rdftest#TestXMLNegativeSyntax.
 */
export class TestCaseXmlNegativeSyntaxHandler implements ITestCaseHandler<TestCaseXmlNegativeSyntax> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCaseXmlNegativeSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    return new TestCaseXmlNegativeSyntax(testCaseData,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body),
      Util.normalizeBaseUrl(resource.property.action.value));
  }

}

export class TestCaseXmlNegativeSyntax implements ITestCaseRdfSyntax {
  public readonly type = "rdfsyntax";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly data: string;
  public readonly baseIRI: string;

  constructor(testCaseData: ITestCaseData, data: string, baseIRI: string) {
    Object.assign(this, testCaseData);
    this.data = data;
    this.baseIRI = baseIRI;
  }

  public async test(parser: IParser): Promise<void> {
    try {
      await parser.parse(this.data, this.baseIRI);
    } catch (e) {
      return;
    }
    throw new Error(`Expected to throw an error when parsing.
  Query: ${this.data}
`);
  }

}
