import {QueryResultQuads} from "../../../lib/testcase/sparql/QueryResultQuads";
const quad = require("rdf-quad");

describe('QueryResultQuads', () => {

  let quadsA;
  let quadsAvar;
  let quadsB;

  beforeEach(() => {
    quadsA = new QueryResultQuads([
      quad('s1', 'p1', 's2'),
      quad('s2', 'p2', 's3'),
    ]);
    quadsAvar = new QueryResultQuads([
      quad('s2', 'p2', 's3'),
      quad('s1', 'p1', 's2'),
    ]);
    quadsB = new QueryResultQuads([
      quad('S1', 'P1', 'S2'),
      quad('S2', 'P2', 'S3'),
    ]);
  });

  describe('when instantiated', () => {
    it('should be instance of QueryResultQuads', () => {
      return expect(quadsA).toBeInstanceOf(QueryResultQuads);
    });

    it('should be of type quads', () => {
      return expect(quadsA.type).toEqual('quads');
    });

    it('should have the correct value', () => {
      return expect(quadsA.value).toEqual([
        quad('s1', 'p1', 's2'),
        quad('s2', 'p2', 's3'),
      ]);
    });
  });

  describe('#equals', () => {
    it('should be false on other types', () => {
      return expect(quadsA.equals(<any> {})).toBe(false);
    });

    it('should be true on equal values', () => {
      return expect(quadsA.equals(quadsA)).toBe(true);
    });

    it('should be true on non-equal but isomorphic values', () => {
      return expect(quadsA.equals(quadsAvar)).toBe(true);
    });

    it('should be false on non-equal values', () => {
      return expect(quadsA.equals(quadsB)).toBe(false);
    });
  });

  describe('#toString', () => {
    it('should stringify the quads', () => {
      return expect(quadsA.toString()).toEqual(`[QueryResultQuads: [
  {
    "subject": "s1",
    "predicate": "p1",
    "object": "s2",
    "graph": ""
  },
  {
    "subject": "s2",
    "predicate": "p2",
    "object": "s3",
    "graph": ""
  }
]]`);
    });
  });

});
