import * as RDF from "rdf-js";

export function normalizeBaseUrl(url: string) {
  if (url.startsWith('https://')) {
    return url.replace('https', 'http');
  }
  return url;
}

/**
 * A parser handler.
 */
export interface IParser {
  parse(data: string, baseIRI: string): Promise<RDF.Quad[]>;
}
