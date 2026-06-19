import type * as RDF from '@rdfjs/types';

/**
 * A query engine handler.
 */
export interface IQueryEngine {
  parse: (queryString: string, options: Record<string, any>) => Promise<void>;
  query: (data: RDF.Quad[], queryString: string, options: Record<string, any>) => Promise<IQueryResult>;
  queryResultFormat?: (data: RDF.Quad[], queryString: string, mediaType: string, options: Record<string, any>) => Promise<NodeJS.ReadableStream>;
}

/**
 * Super type for all query result types.
 */
export type IQueryResult = IQueryResultBoolean | IQueryResultQuads | IQueryResultBindings;

/**
 * Holds a boolean query result.
 */
export interface IQueryResultBoolean {
  type: 'boolean';
  value: boolean;
  equals: (that: IQueryResult, laxCardinality?: boolean) => boolean;
  toString: () => string;
}

/**
 * Holds quad-based query results.
 */
export interface IQueryResultQuads {
  type: 'quads';
  value: RDF.Quad[];
  equals: (that: IQueryResult, laxCardinality?: boolean) => boolean;
  toString: () => string;
}

/**
 * Holds bindings-based query results.
 */
export interface IQueryResultBindings {
  type: 'bindings';
  variables: string[];
  value: Record<string, RDF.Term>[];
  checkOrder: boolean;
  equals: (that: IQueryResult, laxCardinality?: boolean) => boolean;
  toString: () => string;
}
