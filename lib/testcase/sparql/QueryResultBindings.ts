import * as stringify from "json-stable-stringify";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {IQueryResult, IQueryResultBindings} from "./IQueryEngine";

/**
 * Holds bindings-based query results.
 */
export class QueryResultBindings implements IQueryResultBindings {
  public readonly type = 'bindings';
  public variables: string[];
  public value: {[variable: string]: RDF.Term}[];
  public checkOrder: boolean;

  constructor(variables: string[], value: {[variable: string]: RDF.Term}[], checkOrder: boolean) {
    this.variables = variables;
    this.value = value;
    this.checkOrder = checkOrder;
  }

  public static hashBindings(bindings: {[variable: string]: RDF.Term}[], checkOrder: boolean): string {
    const hash = [];
    for (const b of bindings) {
      const bHash: {[id: string]: string} = {};
      for (const variable in b) {
        bHash[variable] = termToString(b[variable]);
      }
      hash.push(stringify(bHash));
    }
    return (checkOrder ? hash : hash.sort()).join('');
  }

  public static hashBindingsCount(bindings: {[variable: string]: RDF.Term}[]): {[hash: string]: number} {
    const hash: {[hash: string]: number} = {};
    for (const b of bindings) {
      const bHash: {[id: string]: string} = {};
      for (const variable in b) {
        bHash[variable] = termToString(b[variable]);
      }
      const bString: string = JSON.stringify(bHash);
      if (!hash[bString]) {
        hash[bString] = 1;
      } else {
        hash[bString]++;
      }
    }
    return hash;
  }

  public equals(that: IQueryResult, laxCardinality?: boolean): boolean {
    if (that.type !== 'bindings') {
      return false;
    }
    if (JSON.stringify(this.variables.sort()) !== JSON.stringify(that.variables.sort())) {
      return false;
    }
    if (laxCardinality) {
      // This is applicable for REDUCED.
      // The actual results can contain duplicates.
      // The expected results contains the upper limit of how many duplicates there can be. The lower limit is 1.
      const countedBindingsExpected: {[hash: string]: number} = QueryResultBindings.hashBindingsCount(this.value);
      const countedBindingsActual: {[hash: string]: number} = QueryResultBindings.hashBindingsCount(that.value);
      if (Object.keys(countedBindingsExpected).sort().join() !== Object.keys(countedBindingsActual).sort().join()) {
        // The fully distinct keys are not equal
        return false;
      }

      // At this point, the keys are equal, so we check if the actual count is not more than the expected count
      for (const key in countedBindingsActual) {
        if (countedBindingsActual[key] > countedBindingsExpected[key]) {
          // The actual value contains *more* occurrences for this binding than allowed
          return false;
        }
      }

      return true;
    } else {
      return QueryResultBindings.hashBindings(this.value, this.checkOrder)
        === QueryResultBindings.hashBindings(that.value, that.checkOrder);
    }
  }

  public toString(): string {
    return `[QueryResultBindings:
    Variables: ${JSON.stringify(this.variables, null, '  ')}
    Bindings:  ${JSON.stringify(this.value, null, '  ')}
]`;
  }

}
