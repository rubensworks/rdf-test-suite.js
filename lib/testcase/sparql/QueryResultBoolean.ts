import {IQueryResult, IQueryResultBoolean} from "./IQueryEngine";

/**
 * Holds a boolean query result.
 */
export class QueryResultBoolean implements IQueryResultBoolean {
  public readonly type = 'boolean';
  public value: boolean;

  constructor(value: boolean) {
    this.value = value;
  }

  public equals(that: IQueryResult): boolean {
    return that.type === 'boolean' && that.value === this.value;
  }

  public toString(): string {
    return `[QueryResultBoolean: ${this.value}]`;
  }

}
