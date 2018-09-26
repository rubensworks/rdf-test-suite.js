import {QueryResultBindings} from "../../../lib/testcase/sparql/QueryResultBindings";
import {namedNode} from "@rdfjs/data-model";
import {QueryResultBoolean} from "../../../lib/testcase/sparql/QueryResultBoolean";

describe('QueryResultBoolean', () => {

  let booleanTrue;
  let booleanFalse;

  beforeEach(() => {
    booleanTrue = new QueryResultBoolean(true);
    booleanFalse = new QueryResultBoolean(false);
  });

  describe('when instantiated', () => {
    it('should be instance of QueryResultBoolean', () => {
      return expect(booleanFalse).toBeInstanceOf(QueryResultBoolean);
    });

    it('should be of type boolean', () => {
      return expect(booleanFalse.type).toEqual('boolean');
    });

    it('should have the correct value', () => {
      return expect(booleanFalse.value).toEqual(false);
    });
  });

  describe('#equals', () => {
    it('should be true on equal values', () => {
      return expect(booleanTrue.equals(booleanTrue)).toBe(true);
    });

    it('should be true on non-equal values', () => {
      return expect(booleanFalse.equals(booleanTrue)).toBe(false);
    });
  });

  describe('#toString', () => {
    it('should stringify the boolean', () => {
      return expect(booleanTrue.toString()).toEqual(`[QueryResultBoolean: true]`);
    });
  });

});
