import * as RDF from 'rdf-js';
import { IQueryEngine } from './IQueryEngine';

/**
 * An update engine handler.
 */
export interface IUpdateEngine extends IQueryEngine {
  update(data: RDF.Quad[], queryString: string, options: {[key: string]: any}): Promise<RDF.Quad[]>;
}
