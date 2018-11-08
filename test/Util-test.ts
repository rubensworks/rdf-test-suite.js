import {literal, namedNode, quad} from "@rdfjs/data-model";
import {existsSync, mkdirSync, readFileSync} from "fs";
import "isomorphic-fetch";
import "jest-rdf";
import {Util} from "../lib/Util";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const stringifyStream = require('stream-to-string');
const arrayifyStream = require('arrayify-stream');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'http://example.org/':
    body = streamifyString('ABC');
    break;
  case 'http://example.org/abc.ttl':
    body = streamifyString('<a> <b> <c>.');
    break;
  case '404':
    return Promise.resolve({ ok: false });
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

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

    it('should return a content type for valid headers with application/octet-stream and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers(
        { 'Content-Type': 'application/octet-stream' }))).toEqual('unknown');
    });

    it('should given priority to the header', () => {
      return expect(Util.identifyContentType('http://example.org/abc.nt', new Headers(
        { 'Content-Type': 'application/sparql-results+json' }))).toEqual('application/sparql-results+json');
    });
  });

  describe('#normalizeBaseUrl', () => {
    it('should normalize https to http', () => {
      return expect(Util.normalizeBaseUrl('https://example.org/')).toEqual('http://example.org/');
    });

    it('should not normalize http', () => {
      return expect(Util.normalizeBaseUrl('http://example.org/')).toEqual('http://example.org/');
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

  describe('#fetchCached', () => {
    const cachePath: string = __dirname + '/.rdf-test-cache/';

    beforeEach(() => {
      if (!existsSync(cachePath)) {
        mkdirSync(cachePath);
      }
    });

    afterEach((done) => {
      require('rimraf')(cachePath, {}, done);
    });

    it('should reject on 404s', () => {
      return expect(Util.fetchCached('404')).rejects.toBeTruthy();
    });

    it('should not cache without cachePath', async () => {
      const response = await Util.fetchCached('http://example.org/');
      expect(await stringifyStream(response.body)).toEqual('ABC');
      expect(response.headers).toEqual(new Headers({ a: 'b' }));
      expect(response.url).toEqual('http://example.org/');
    });

    it('should cache with cachePath', async () => {
      const spy = jest.spyOn(<any> global, 'fetch');

      const response1 = await Util.fetchCached('http://example.org/', cachePath);
      expect(await stringifyStream(response1.body)).toEqual('ABC');
      expect(response1.headers).toEqual(new Headers({ a: 'b' }));
      expect(response1.url).toEqual('http://example.org/');

      expect(readFileSync(cachePath + 'http%3A%2F%2Fexample.org%2F', 'utf8')).toEqual('ABC');
      expect(readFileSync(cachePath + 'http%3A%2F%2Fexample.org%2F.headers', 'utf8')).toEqual('{\"a\":\"b\"}');
      expect(readFileSync(cachePath + 'http%3A%2F%2Fexample.org%2F.url', 'utf8')).toEqual('http://example.org/');

      const response2 = await Util.fetchCached('http://example.org/', cachePath);
      expect(await stringifyStream(response2.body)).toEqual('ABC');
      expect(response2.headers).toEqual(new Headers({ a: 'b' }));
      expect(response2.url).toEqual('http://example.org/');

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('#parseRdfRaw', () => {
    it('should error on an unknown content type', async () => {
      expect(() => Util.parseRdfRaw('unknown', 'http://example.org/', streamifyString('ABC')))
        .toThrow();
    });

    it('should parse application/x-turtle streams', async () => {
      expect(await arrayifyStream(Util.parseRdfRaw('application/x-turtle', 'http://example.org/',
        streamifyString('<a> <b> <c>.'))))
        .toEqualRdfQuadArray([
          quad(namedNode('http://example.org/a'), namedNode('http://example.org/b'),
            namedNode('http://example.org/c')),
        ]);
    });

    it('should parse text/turtle streams', async () => {
      expect(await arrayifyStream(Util.parseRdfRaw('text/turtle', 'http://example.org/',
        streamifyString('<a> <b> <c>.'))))
        .toEqualRdfQuadArray([
          quad(namedNode('http://example.org/a'), namedNode('http://example.org/b'),
            namedNode('http://example.org/c')),
        ]);
    });

    it('should parse application/n-triples streams', async () => {
      expect(await arrayifyStream(Util.parseRdfRaw('application/n-triples', 'http://example.org/',
        streamifyString('<a> <b> <c>.'))))
        .toEqualRdfQuadArray([
          quad(namedNode('http://example.org/a'), namedNode('http://example.org/b'),
            namedNode('http://example.org/c')),
        ]);
    });

    it('should parse application/n-quads streams', async () => {
      expect(await arrayifyStream(Util.parseRdfRaw('application/n-quads', 'http://example.org/',
        streamifyString('<a> <b> <c> <d>.'))))
        .toEqualRdfQuadArray([
          quad(namedNode('http://example.org/a'), namedNode('http://example.org/b'),
            namedNode('http://example.org/c'), namedNode('http://example.org/d')),
        ]);
    });

    it('should parse application/rdf+xml streams', async () => {
      expect(await arrayifyStream(Util.parseRdfRaw('application/rdf+xml', 'http://example.org/',
        streamifyString(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax" />

</rdf:RDF>`))))
        .toEqualRdfQuadArray([
          quad(
            namedNode('http://www.w3.org/TR/rdf-syntax-grammar'),
            namedNode('http://purl.org/dc/elements/1.1/title'),
            literal('RDF1.1 XML Syntax')),
        ]);
    });
  });

  describe('#fetchRdf', () => {
    it('should fetch a ttl document', async () => {
      const response = await Util.fetchRdf('http://example.org/abc.ttl');
      expect(response[0]).toEqual('http://example.org/abc.ttl');
      expect(await arrayifyStream(response[1])).toEqualRdfQuadArray([
        quad(
          namedNode('http://example.org/a'),
          namedNode('http://example.org/b'),
          namedNode('http://example.org/c')),
      ]);
    });
  });

  describe('#licenseToUri', () => {
    it('should convert the MIT license to its URI', () => {
      return expect(Util.licenseToUri('MIT')).toEqual('http://opensource.org/licenses/MIT');
    });
  });

});
