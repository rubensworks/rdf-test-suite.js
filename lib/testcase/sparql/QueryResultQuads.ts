import {isomorphic} from "rdf-isomorphic";
import * as RDF from "rdf-js";
import {quadToStringQuad} from "rdf-string";
import {IQueryResult, IQueryResultQuads} from "./IQueryEngine";

/**
 * Holds quad-based query results.
 */
export class QueryResultQuads implements IQueryResultQuads {
  public readonly type = 'quads';
  public value: RDF.Quad[];

  constructor(value: RDF.Quad[]) {
    this.value = value;
  }

  public equals(that: IQueryResult): boolean {
    if (that.type !== 'quads') {
      return false;
    }
    return isomorphic(this.value, that.value);
  }

  public toString(): string {
    return `[QueryResultQuads: ${JSON.stringify(this.value.map(quadToStringQuad), null, '  ')}]`;
  }

}