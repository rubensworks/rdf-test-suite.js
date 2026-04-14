import type * as RDF from '@rdfjs/types';
import type { IQueryEngine } from './IQueryEngine';

/**
 * An update engine handler.
 */
export interface IUpdateEngine extends IQueryEngine {
  update: (data: RDF.Quad[], queryString: string, options: Record<string, any>) => Promise<RDF.Quad[]>;
}
