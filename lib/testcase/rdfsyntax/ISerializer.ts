import * as RDF from "rdf-js";

/**
 * A serializer handler.
 */
export interface ISerializer {
  serialize(data: RDF.Quad[], baseIRI: string, options: {[key: string]: any}): Promise<string>;
}
