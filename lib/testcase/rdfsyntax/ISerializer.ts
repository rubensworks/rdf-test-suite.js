import type * as RDF from '@rdfjs/types';

/**
 * A serializer handler.
 */
export interface ISerializer {
  serialize: (data: RDF.Quad[], baseIRI: string, options: Record<string, any>) => Promise<string>;
}
