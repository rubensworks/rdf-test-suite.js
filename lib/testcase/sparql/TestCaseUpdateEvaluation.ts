import { ITestCaseSparql } from './ITestCaseSparql';
import * as RDF from '@rdfjs/types';
import { ITestCaseData } from '../ITestCase';
import { ErrorTest } from '../../ErrorTest';
import { IUpdateEngine } from './IUpdateEngine';
import { isomorphic } from 'rdf-isomorphic';
import { IQueryDataLink, TestCaseQueryEvaluation, TestCaseQueryEvaluationHandler } from './TestCaseQueryEvaluation';
import { IFetchOptions, Util } from '../../Util';
import { quadToStringQuad } from 'rdf-string';
import { ITestCaseHandler } from '../ITestCaseHandler';
import { Resource } from 'rdf-object';
import { DataFactory } from 'rdf-data-factory';
// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');
const DF = new DataFactory();

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#UpdateEvaluationTest.
 */
export class TestCaseUpdateEvaluationHandler implements ITestCaseHandler<TestCaseUpdateEvaluation> {

  /**
   * Obtain all data links for the given update test action.
   * @param action A query test action.
   */
  public static getQueryDataLinks(action: Resource): IQueryDataLink[] {
    const queryDataLinks: IQueryDataLink[] = [];
    if (action.property.updateData) {
      queryDataLinks.push({
        dataUri: action.property.updateData.value,
      })
    }
    for (const updateGraphData of action.properties.updateGraphData) {
      if (updateGraphData.property.updateGraph) {
        queryDataLinks.push({
          dataUri: updateGraphData.property.updateGraph.value,
          dataGraph: DF.namedNode(Util.normalizeBaseUrl(updateGraphData.property.label.value)),
        });
      } else {
        queryDataLinks.push({
          dataUri: updateGraphData.value,
          dataGraph: DF.namedNode(Util.normalizeBaseUrl(updateGraphData.value)),
        });
      }
    }
    return queryDataLinks;
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  options?: IFetchOptions): Promise<TestCaseUpdateEvaluation> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    const action = resource.property.action;
    if (!action.property.updateQuery) {
      throw new Error(`Missing ut:request in mf:action of ${resource}`);
    }
    const result = resource.property.result;

    // Determine links to data
    const dataInitialLinks: IQueryDataLink[] = TestCaseUpdateEvaluationHandler.getQueryDataLinks(action);
    const dataExpectedLinks: IQueryDataLink[] = TestCaseUpdateEvaluationHandler.getQueryDataLinks(result);

    // Collect all query data
    const dataInitial: RDF.Quad[] = await TestCaseQueryEvaluationHandler
      .resolveQueryDataLinks(dataInitialLinks, options);
    const dataExpected: RDF.Quad[] = await TestCaseQueryEvaluationHandler
      .resolveQueryDataLinks(dataExpectedLinks, options);

    return new TestCaseUpdateEvaluation(
      testCaseData,
      {
        baseIRI: Util.normalizeBaseUrl(action.property.updateQuery.value),
        dataInitial,
        dataExpected,
        dataInitialLinks,
        dataExpectedLinks,
        updateQueryString: await stringifyStream((await Util.fetchCached(action.property.updateQuery.value, options)).body),
      });
  }
}

export interface ITestCaseUpdateEvaluationProps {
  baseIRI: string;
  updateQueryString: string;
  dataInitial: RDF.Quad[];
  dataExpected: RDF.Quad[];
  dataInitialLinks: IQueryDataLink[];
  dataExpectedLinks: IQueryDataLink[];
}

export class TestCaseUpdateEvaluation implements ITestCaseSparql {
  public readonly type = "sparql";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly baseIRI: string;
  public readonly updateQueryString: string;
  public readonly dataInitial: RDF.Quad[];
  public readonly dataExpected: RDF.Quad[];
  public readonly dataInitialLinks: IQueryDataLink[];
  public readonly dataExpectedLinks: IQueryDataLink[];

  constructor(testCaseData: ITestCaseData, props: ITestCaseUpdateEvaluationProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  public async test(engine: IUpdateEngine, injectArguments: any): Promise<void> {
    const dataResult: RDF.Quad[] = await engine.update(this.dataInitial, this.updateQueryString,
      { baseIRI: this.baseIRI, ...injectArguments });
    if (!isomorphic(this.dataExpected, dataResult)) {
      throw new ErrorTest(`Invalid update query evaluation

  Query:\n\n${this.updateQueryString}

  Data input links: ${TestCaseQueryEvaluation.queryDataLinksToString(this.dataInitialLinks)}

  Data expected output links: ${TestCaseQueryEvaluation.queryDataLinksToString(this.dataExpectedLinks)}

  Expected: ${JSON.stringify(this.dataExpected.map(quadToStringQuad), null, '  ')}

  Got: \n ${JSON.stringify(dataResult.map(quadToStringQuad), null, '  ')}
`);
    }
  }
}
