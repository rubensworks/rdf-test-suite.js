import type { ITestCase } from '../ITestCase';
import type { IParser } from './IParser';

/**
 * An RDF syntax test case data holder.
 */
export interface ITestCaseRdfSyntax extends ITestCase<IParser> {
  type: 'rdfsyntax';
}
