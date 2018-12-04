import {Resource} from "rdf-object";
import {Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IQueryEngine} from "./IQueryEngine";
import {ITestCaseSparql} from "./ITestCaseSparql";
// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#NegativeSyntaxTest.
 */
export class TestCaseNegativeSyntaxHandler implements ITestCaseHandler<TestCaseNegativeSyntax> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCaseNegativeSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    return new TestCaseNegativeSyntax(testCaseData,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body));
  }

}

export class TestCaseNegativeSyntax implements ITestCaseSparql {
  public readonly type = "sparql";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly queryString: string;

  constructor(testCaseData: ITestCaseData, queryString: string) {
    Object.assign(this, testCaseData);
    this.queryString = queryString;
  }

  public async test(engine: IQueryEngine, injectArguments: any): Promise<void> {
    try {
      await engine.parse(this.queryString, injectArguments);
    } catch (e) {
      return;
    }
    throw new Error(`Expected ${this.queryString} to throw an error when parsing.`);
  }

}
