import type { ITestCase } from '../ITestCase';
import type { IQueryEngine } from './IQueryEngine';

/**
 * A SPARQL test case data holder.
 */
export interface ITestCaseSparql extends ITestCase<IQueryEngine> {
  type: 'sparql';
}
