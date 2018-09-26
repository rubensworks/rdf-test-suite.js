import "isomorphic-fetch";
import {Util} from "../lib/Util";

describe('Util', () => {

  describe('#identifyContentType', () => {
    it('should return unknown for empty headers and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers()))
        .toEqual('unknown');
    });

    it('should return a content type for empty headers and known prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.nt', new Headers()))
        .toEqual('application/n-triples');
    });

    it('should return a content type for valid headers and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers(
        { 'Content-Type': 'application/n-triples' }))).toEqual('application/n-triples');
    });

    it('should given priority to the header', () => {
      return expect(Util.identifyContentType('http://example.org/abc.nt', new Headers(
        { 'Content-Type': 'application/sparql-results+json' }))).toEqual('application/sparql-results+json');
    });
  });

  describe('#promiseValues', () => {
    it('should resolve an empty hash', () => {
      return expect(Util.promiseValues({})).resolves.toEqual({});
    });

    it('should resolve a hash with promise values', () => {
      return expect(Util.promiseValues({
        a: Promise.resolve(1),
        b: Promise.resolve(2),
        c: Promise.resolve(3),
      })).resolves.toEqual({
        a: 1,
        b: 2,
        c: 3,
      });
    });
  });

});