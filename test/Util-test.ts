import {existsSync, mkdirSync, readFileSync} from "fs";
import "isomorphic-fetch";
import {Util} from "../lib/Util";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const stringifyStream = require('stream-to-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  switch (url) {
  case 'http://example.org/':
    const body = streamifyString('ABC');
    return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
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

});