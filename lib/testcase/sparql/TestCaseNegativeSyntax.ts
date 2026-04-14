import type { Resource } from 'rdf-object';
import { ErrorTest } from '../../ErrorTest';
import type { IFetchOptions } from '../../Util';
import { Util } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';

// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#NegativeSyntaxTest.
 */
export class TestCaseNegativeSyntaxHandler implements ITestCaseHandler<TestCaseNegativeSyntax> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData, options?: IFetchOptions): Promise<TestCaseNegativeSyntax> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    return new TestCaseNegativeSyntax(testCaseData, await stringifyStream((await Util.fetchCached(resource.property.action.value, options)).body), Util.normalizeBaseUrl(resource.property.action.value));
  }
}

export class TestCaseNegativeSyntax implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly queryString: string;
  public readonly baseIRI: string;

  constructor(testCaseData: ITestCaseData, queryString: string, baseIRI: string) {
    Object.assign(this, testCaseData);
    this.queryString = queryString;
    this.baseIRI = baseIRI;
  }

  public async test(engine: IQueryEngine, injectArguments: any): Promise<void> {
    try {
      await engine.parse(this.queryString, { baseIRI: this.baseIRI, ...injectArguments });
    } catch {
      return;
    }
    throw new ErrorTest(`Expected ${this.queryString} to throw an error when parsing.
  Input: ${this.queryString}
`);
  }
}
