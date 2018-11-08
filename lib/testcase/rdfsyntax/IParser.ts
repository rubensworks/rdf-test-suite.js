import * as RDF from "rdf-js";

/**
 * A parser handler.
 */
export interface IParser {
  parse(data: string, baseIRI: string, options: {[key: string]: any}): Promise<RDF.Quad[]>;
}
