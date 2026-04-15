import type * as RDF from '@rdfjs/types';
import type { ITestCaseRdfSyntax } from './ITestCaseRdfSyntax';

/**
 * A parser handler.
 */
export interface IParser {
  parse: (data: string, baseIRI: string, options: Record<string, any>, testCase?: ITestCaseRdfSyntax) => Promise<RDF.Quad[]>;
}
