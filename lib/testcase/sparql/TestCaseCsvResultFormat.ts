import type * as RDF from '@rdfjs/types';
import { parse } from 'papaparse';
import type { Resource } from 'rdf-object';
import { ErrorTest } from '../../ErrorTest';
import type { IFetchOptions, IFetchResponse } from '../../Util';
import { Util } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';
import { TestCaseQueryEvaluation, TestCaseQueryEvaluationHandler } from './TestCaseQueryEvaluation';
import type { IQueryDataLink } from './TestCaseQueryEvaluation';

// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#CSVResultFormatTest.
 */
export class TestCaseCsvResultFormatHandler implements ITestCaseHandler<TestCaseCsvResultFormat> {
  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData, options?: IFetchOptions): Promise<TestCaseCsvResultFormat> {
    const action = resource.property.action;
    if (!action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    if (!action.property.query) {
      throw new Error(`Missing qt:query in mf:action of ${resource}`);
    }

    const queryDataLinks: IQueryDataLink[] = TestCaseQueryEvaluationHandler.getQueryDataLinks(action);
    const queryData: RDF.Quad[] = await TestCaseQueryEvaluationHandler.resolveQueryDataLinks(queryDataLinks, options);

    const resultSource: IFetchResponse = await Util.fetchCached(resource.property.result.value, options);

    return new TestCaseCsvResultFormat(
      testCaseData,
      {
        baseIRI: Util.normalizeBaseUrl(action.property.query.value),
        expectedResult: await stringifyStream(resultSource.body),
        queryDataLinks,
        queryData,
        queryString: await stringifyStream((await Util.fetchCached(action.property.query.value, options)).body),
        resultSource,
      },
    );
  }
}

export interface ITestCaseCsvResultFormatProps {
  baseIRI: string;
  queryString: string;
  queryData: RDF.Quad[];
  expectedResult: string;
  resultSource: IFetchResponse;
  queryDataLinks: IQueryDataLink[];
}

export class TestCaseCsvResultFormat implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly baseIRI: string;
  public readonly queryString: string;
  public readonly queryData: RDF.Quad[];
  public readonly expectedResult: string;
  public readonly resultSource: IFetchResponse;
  public readonly queryDataLinks: IQueryDataLink[];

  constructor(testCaseData: ITestCaseData, props: ITestCaseCsvResultFormatProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  public static parseCsv(result: string) {
    const parsed = parse<Record<string, string>>(result, {
      header: true,
      skipEmptyLines: true,
    });

    const strictErrors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');

    if (strictErrors.length > 0) {
      const error = strictErrors[0];
      throw new Error(`Invalid CSV result (Row ${error.row}): ${error.message}`);
    }

    if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
      throw new Error('Invalid CSV result: Missing header row.');
    }

    return {
      variables: parsed.meta.fields,
      rows: parsed.data,
    };
  }

  private static matchRows(
    expectedRows: Record<string, string>[],
    actualRows: Record<string, string>[],
    bNodeMapping: Record<string, string> = {},
  ): boolean {
    if (expectedRows.length === 0) {
      return actualRows.length === 0;
    }

    const expectedRow = expectedRows[0];
    const remainingExpected = expectedRows.slice(1);

    for (let i = 0; i < actualRows.length; i++) {
      const actualRow = actualRows[i];
      const newMapping = { ...bNodeMapping };
      let rowMatches = true;

      for (const [ variable, expectedVal ] of Object.entries(expectedRow)) {
        const actualVal = actualRow[variable];

        if (expectedVal && expectedVal.startsWith('_:')) {
          if (!actualVal || !actualVal.startsWith('_:')) {
            rowMatches = false;
            break;
          }

          if (newMapping[expectedVal]) {
            if (newMapping[expectedVal] !== actualVal) {
              rowMatches = false;
              break;
            }
          } else {
            if (Object.values(newMapping).includes(actualVal)) {
              rowMatches = false;
              break;
            }
            newMapping[expectedVal] = actualVal;
          }
        } else if (expectedVal !== actualVal) {
          rowMatches = false;
          break;
        }
      }

      if (rowMatches) {
        const remainingActual = [ ...actualRows.slice(0, i), ...actualRows.slice(i + 1) ];
        if (this.matchRows(remainingExpected, remainingActual, newMapping)) {
          return true;
        }
      }
    }

    return false;
  }

  public static csvResultsEqual(expected: string, actual: string): boolean {
    try {
      const expectedData = TestCaseCsvResultFormat.parseCsv(expected);
      const actualData = TestCaseCsvResultFormat.parseCsv(actual);

      if (expectedData.rows.length !== actualData.rows.length) {
        return false;
      }

      const expectedVars = expectedData.variables;
      const actualVars = actualData.variables;

      const expectedSorted = [ ...expectedVars ].sort().join(',');
      const actualSorted = [ ...actualVars ].sort().join(',');

      if (expectedSorted !== actualSorted) {
        return false;
      }

      return TestCaseCsvResultFormat.matchRows(expectedData.rows, actualData.rows);
    } catch {
      return false;
    }
  }

  public async test(engine: IQueryEngine, injectArguments: any): Promise<void> {
    if (!engine.queryResultFormat) {
      throw new ErrorTest('CSV result format tests require queryResultFormat to be implemented by the query engine.');
    }

    const result = await stringifyStream(await engine.queryResultFormat(
      this.queryData,
      this.queryString,
      'text/csv',
      { baseIRI: this.baseIRI, ...injectArguments },
    ));

    if (!TestCaseCsvResultFormat.csvResultsEqual(this.expectedResult, result)) {
      throw new ErrorTest(`Invalid CSV result format

  Query:\n\n${this.queryString}

  Data links: ${TestCaseQueryEvaluation.queryDataLinksToString(this.queryDataLinks)}

  Result Source: ${this.resultSource.url}

  Expected:\n${this.expectedResult}

  Got:\n${result}
`);
    }
  }
}
