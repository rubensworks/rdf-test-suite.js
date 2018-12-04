import {Resource} from "rdf-object";
import {Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IQueryEngine} from "./IQueryEngine";
import {ITestCaseSparql} from "./ITestCaseSparql";
// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#PositiveSyntaxTest.
 */
export class TestCasePositiveSyntaxHandler implements ITestCaseHandler<TestCasePositiveSyntax> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  cachePath?: string): Promise<TestCasePositiveSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource.term.value}`);
    }
    return new TestCasePositiveSyntax(testCaseData,
      await stringifyStream((await Util.fetchCached(resource.property.action.value, cachePath)).body));
  }

}

export class TestCasePositiveSyntax implements ITestCaseSparql {
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
    await engine.parse(this.queryString, injectArguments);
    return;
  }

}
