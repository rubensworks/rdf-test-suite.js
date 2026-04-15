import type { ITestCase } from '../ITestCase';
import type { ISerializer } from './ISerializer';

/**
 * An test case data holder for serializations from RDF syntax.
 */
export interface ITestCaseFromRdfSyntax extends ITestCase<ISerializer> {
  type: 'fromrdfsyntax';
}
