import {ITestCase} from "../ITestCase";
import {IQueryEngine} from "./IQueryEngine";

/**
 * A SPARQL test case data holder.
 */
export interface ITestCaseSparql extends ITestCase<IQueryEngine> {
  type: 'sparql';
}
