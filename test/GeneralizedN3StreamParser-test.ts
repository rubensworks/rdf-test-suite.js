import "jest-rdf";
import {GeneralizedN3StreamParser} from "../lib/GeneralizedN3StreamParser";
import {StreamParser} from "n3";
// tslint:disable:no-var-requires
const quad = require("rdf-quad");
const streamifyString = require('streamify-string');
const arrayifyStream = require('arrayify-stream');

describe('GeneralizedN3StreamParser', () => {

  let parser;

  beforeEach(() => {
    parser = new GeneralizedN3StreamParser({ format: 'text/turtle' });
  });

  it('should parse blank nodes as predicates', async () => {
    return expect(await arrayifyStream(streamifyString(`
@prefix foo: <http://example.org/ns#> .
_:s _:p _:o.`).pipe(parser)))
      .toEqualRdfQuadArray([
        quad('_:s', '_:p', '_:o'),
      ]);
  });

  it('should emit errors on invalid turtle', async () => {
    return expect(arrayifyStream(streamifyString(`.`).pipe(parser))).rejects.toThrow();
  });

  it('should not break regular N3 Turtle parser', async () => {
    return expect(arrayifyStream(streamifyString(`
@prefix foo: <http://example.org/ns#> .
_:s _:p _:o.`).pipe(new StreamParser({ format: 'text/turtle' }))))
      .rejects.toThrow('Disallowed blank node as predicate on line 3.');
  });

});
