import 'cross-fetch/polyfill';
import 'jest-rdf';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { join as pathJoin } from 'node:path';
import type * as RDF from '@rdfjs/types';
import { arrayifyStream } from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { Util } from '../lib/Util';

// This allows mocking of fs functions later on
jest.mock<typeof import('fs')>('fs', () => {
  return {
    __esModule: true,
    ...jest.requireActual('fs'),
  };
});

const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * Create a response body of which the chunks, end and failure are controlled by the test.
 */
function controllableBody(): {
  stream: ReadableStream<Uint8Array>;
  push: (chunk: string) => void;
  end: (chunk: string) => void;
  fail: (error: Error) => void;
} {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controllerInner) {
      controller = controllerInner;
    },
  });
  return {
    stream,
    push: chunk => controller.enqueue(new TextEncoder().encode(chunk)),
    end(chunk) {
      controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
    fail: error => controller.error(error),
  };
}

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10));
}

// Mock fetch
(<any> globalThis).fetch = (url: string) => {
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
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200 }));
};

describe('Util', () => {
  describe('#identifyContentType', () => {
    it('should return unknown for empty headers and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers()))
        .toBe('unknown');
    });

    it('should return a content type for empty headers and known prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.nt', new Headers()))
        .toBe('application/n-triples');
    });

    it('should return text/n3 for an N3 extension', () => {
      return expect(Util.identifyContentType('http://example.org/abc.n3', new Headers()))
        .toBe('text/n3');
    });

    it('should return a content type for valid headers and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers(
        { 'Content-Type': 'application/n-triples' },
      ))).toBe('application/n-triples');
    });

    it('should return a content type for valid headers with application/octet-stream and an unknown prefix', () => {
      return expect(Util.identifyContentType('http://example.org/abc.xyz', new Headers(
        { 'Content-Type': 'application/octet-stream' },
      ))).toBe('unknown');
    });

    it('should given priority to the header', () => {
      return expect(Util.identifyContentType('http://example.org/abc.nt', new Headers(
        { 'Content-Type': 'application/sparql-results+json' },
      ))).toBe('application/sparql-results+json');
    });
  });

  describe('#normalizeBaseUrl', () => {
    it('should normalize https to http', () => {
      return expect(Util.normalizeBaseUrl('https://example.org/')).toBe('http://example.org/');
    });

    it('should not normalize http', () => {
      return expect(Util.normalizeBaseUrl('http://example.org/')).toBe('http://example.org/');
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
    const cachePath = `${pathJoin(__dirname, '.rdf-test-cache')}/`;

    beforeEach(() => {
      if (!existsSync(cachePath)) {
        mkdirSync(cachePath);
      }
    });

    afterEach((done) => {
      jest.restoreAllMocks();
      require('rimraf').rimraf(cachePath).then(() => done());
    });

    it('should reject on 404s', () => {
      return expect(Util.fetchCached('404')).rejects.toBeTruthy();
    });

    it('should handle urlToFileMappings', async() => {
      const urlToFileMappings = [
        { url: 'http://example.org/abc/', path: `${pathJoin(__dirname, 'assets', 'mappings')}/` },
      ];
      const response = await Util.fetchCached('http://example.org/abc/def.txt', { urlToFileMappings });
      await expect(stringifyStream(response.body)).resolves.toBe('XYZ\n');
      expect(response.headers).toEqual(new Headers({}));
      expect(response.url).toBe('http://example.org/abc/def.txt');
    });

    it('should handle urlToFileMappings with hash', async() => {
      const urlToFileMappings = [
        { url: 'http://example.org/abc/', path: `${pathJoin(__dirname, 'assets', 'mappings')}/` },
      ];
      const response = await Util.fetchCached('http://example.org/abc/def.txt#hash', { urlToFileMappings });
      await expect(stringifyStream(response.body)).resolves.toBe('XYZ\n');
      expect(response.headers).toEqual(new Headers({}));
      expect(response.url).toBe('http://example.org/abc/def.txt');
    });

    it('should handle urlToFileMappings and error on non-existing file', async() => {
      const urlToFileMappings = [
        { url: 'http://example.org/abc/', path: `${pathJoin(__dirname, 'assets', 'mappings')}/` },
      ];
      return expect(Util.fetchCached('http://example.org/abc/notfound.txt', { urlToFileMappings }))
        .rejects.toThrow();
    });

    it('should handle urlToFileMappings and skip non-mapped URLs', () => {
      const urlToFileMappings = [
        { url: 'http://example.org/abc/', path: `${pathJoin(__dirname, 'assets', 'mappings')}/` },
      ];
      return expect(Util.fetchCached('http://example.org/def/', { urlToFileMappings })).rejects.toBeTruthy();
    });

    it('should not cache without cachePath', async() => {
      const response = await Util.fetchCached('http://example.org/');
      await expect(stringifyStream(response.body)).resolves.toBe('ABC');
      expect(response.headers).toEqual(new Headers({ a: 'b' }));
      expect(response.url).toBe('http://example.org/');
    });

    it('should use a custom fetch function', async() => {
      const fetch = jest.fn().mockResolvedValue(new Response('XYZ', { headers: new Headers({ a: 'c' }) }));
      const init = { headers: { accept: 'text/plain' }};
      const response = await Util.fetchCached('http://example.org/custom', { fetch }, init);
      await expect(stringifyStream(response.body)).resolves.toBe('XYZ');
      expect(response.headers.get('a')).toBe('c');
      expect(response.url).toBe('http://example.org/custom');
      expect(fetch).toHaveBeenCalledWith('http://example.org/custom', init);
    });

    it('should cache with cachePath', async() => {
      const spy = jest.spyOn(<any> globalThis, 'fetch');

      const response1 = await Util.fetchCached('http://example.org/', { cachePath });
      await expect(stringifyStream(response1.body)).resolves.toBe('ABC');
      expect(response1.headers).toEqual(new Headers({ a: 'b' }));
      expect(response1.url).toBe('http://example.org/');

      expect(readFileSync(`${cachePath}http%3A%2F%2Fexample.org%2F`, 'utf8')).toBe('ABC');
      expect(readFileSync(`${cachePath}http%3A%2F%2Fexample.org%2F.headers`, 'utf8')).toBe('{"a":"b"}');
      expect(readFileSync(`${cachePath}http%3A%2F%2Fexample.org%2F.url`, 'utf8')).toBe('http://example.org/');
      expect(readdirSync(cachePath)).toHaveLength(3);

      const response2 = await Util.fetchCached('http://example.org/', { cachePath });
      await expect(stringifyStream(response2.body)).resolves.toBe('ABC');
      expect(response2.headers).toEqual(new Headers({ a: 'b' }));
      expect(response2.url).toBe('http://example.org/');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache URLs that are too long for a file name', async() => {
      const url = `http://example.org/${'a'.repeat(300)}`;
      const fetch = jest.fn().mockResolvedValue(new Response('XYZ'));
      const response = await Util.fetchCached(url, { cachePath, fetch });
      await expect(stringifyStream(response.body)).resolves.toBe('XYZ');
      expect(readdirSync(cachePath)).toEqual([]);
    });

    it('should only make a cached body visible once it is complete', async() => {
      const body = controllableBody();
      const fetch = jest.fn().mockResolvedValue(new Response(body.stream, { headers: new Headers({ a: 'b' }) }));

      const promise = Util.fetchCached('http://example.org/slow', { cachePath, fetch });
      body.push('AB');
      await flushPromises();
      expect(readdirSync(cachePath)).toEqual([]);

      body.end('C');
      const response = await promise;
      await expect(stringifyStream(response.body)).resolves.toBe('ABC');
      expect(readFileSync(`${cachePath}http%3A%2F%2Fexample.org%2Fslow`, 'utf8')).toBe('ABC');
      expect(readFileSync(`${cachePath}http%3A%2F%2Fexample.org%2Fslow.headers`, 'utf8')).toBe('{"a":"b"}');
      expect(readdirSync(cachePath)).toHaveLength(3);
    });

    it('should share one download between concurrent requests for the same URL', async() => {
      const body = controllableBody();
      const fetch = jest.fn().mockResolvedValue(new Response(body.stream));

      const promise1 = Util.fetchCached('http://example.org/shared', { cachePath, fetch });
      const promise2 = Util.fetchCached('http://example.org/shared', { cachePath, fetch });
      await flushPromises();
      body.end('ABC');

      const [ response1, response2 ] = await Promise.all([ promise1, promise2 ]);
      await expect(stringifyStream(response1.body)).resolves.toBe('ABC');
      await expect(stringifyStream(response2.body)).resolves.toBe('ABC');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should not cache a body that failed to download', async() => {
      const body = controllableBody();
      const fetch = jest.fn().mockResolvedValueOnce(new Response(body.stream));

      const promise1 = Util.fetchCached('http://example.org/failing', { cachePath, fetch });
      const promise2 = Util.fetchCached('http://example.org/failing', { cachePath, fetch });
      body.push('AB');
      await flushPromises();
      body.fail(new Error('connection reset'));

      await expect(promise1).rejects.toThrow('connection reset');
      await expect(promise2).rejects.toThrow('connection reset');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(readdirSync(cachePath)).toEqual([]);

      // A later request downloads again
      fetch.mockResolvedValueOnce(new Response('ABC'));
      const response = await Util.fetchCached('http://example.org/failing', { cachePath, fetch });
      await expect(stringifyStream(response.body)).resolves.toBe('ABC');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it.each([
      [ 'headers are missing', { '.url': 'http://example.org/' }],
      [ 'url is missing', { '.headers': '{"a":"b"}' }],
      [ 'headers are invalid', { '.url': 'http://example.org/', '.headers': '{"a":' }],
    ])('should download again if the cached %s', async(_label, metadata: Record<string, string>) => {
      const file = `${cachePath}http%3A%2F%2Fexample.org%2F`;
      writeFileSync(file, 'TRUNCATED');
      for (const [ suffix, content ] of Object.entries(metadata)) {
        writeFileSync(file + suffix, content);
      }

      const response = await Util.fetchCached('http://example.org/', { cachePath });
      await expect(stringifyStream(response.body)).resolves.toBe('ABC');
      expect(readFileSync(file, 'utf8')).toBe('ABC');
      expect(readFileSync(`${file}.headers`, 'utf8')).toBe('{"a":"b"}');
      expect(readFileSync(`${file}.url`, 'utf8')).toBe('http://example.org/');
    });

    it('should reject if writeFileSync fails', async() => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('unknown error');
      });
      await expect(Util.fetchCached('http://example.org/', { cachePath })).rejects.toThrow('unknown error');
      expect(readdirSync(cachePath)).toEqual([]);
    });

    it('should not reject if writeFileSync fails with ENAMETOOLONG', async() => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        const error = new Error('unknown error');
        (<any> error).code = 'ENAMETOOLONG';
        throw error;
      });
      const response = await Util.fetchCached('http://example.org/', { cachePath });
      await expect(stringifyStream(response.body)).resolves.toBe('ABC');
      expect(readdirSync(cachePath)).toEqual([]);
    });

    it('should remove temporary files if renameSync fails', async() => {
      jest.spyOn(fs, 'renameSync').mockImplementation(() => {
        throw new Error('rename error');
      });
      await expect(Util.fetchCached('http://example.org/', { cachePath })).rejects.toThrow('rename error');
      expect(readdirSync(cachePath)).toEqual([]);
    });
  });

  describe('#parseRdfRaw', () => {
    it('should error on an unknown content type with vague url', async() => {
      expect(() => Util.parseRdfRaw('unknown', 'http://example.org/', streamifyString('ABC')))
        .toThrow();
    });

    it('should workaround an unknown content type with explicit url extension', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('unknown', 'http://example.org/apples.ttl', streamifyString('<a> <b> <c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://example.org/a'), DF.namedNode('http://example.org/b'), DF.namedNode('http://example.org/c')),
        ]);
    });

    it('should workaround an unknown content type with explicit url extension for trig', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('unknown', 'http://example.org/apples.trig', streamifyString('<a> <b> <c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://example.org/a'), DF.namedNode('http://example.org/b'), DF.namedNode('http://example.org/c')),
        ]);
    });

    it('should workaround an unknown content type with an N3 url extension', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('unknown', 'http://example.org/apples.n3', streamifyString('"s"^^<t> <p> "o".')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.literal('s', DF.namedNode('http://example.org/t')), DF.namedNode('http://example.org/p'), DF.literal('o')),
        ]);
    });

    it('should parse application/x-turtle streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('application/x-turtle', 'http://example.org/', streamifyString('<a> <b> <c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://example.org/a'), DF.namedNode('http://example.org/b'), DF.namedNode('http://example.org/c')),
        ]);
    });

    it('should parse text/turtle streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('text/turtle', 'http://example.org/', streamifyString('<a> <b> <c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://example.org/a'), DF.namedNode('http://example.org/b'), DF.namedNode('http://example.org/c')),
        ]);
    });

    it('should parse text/turtle streams with blank node predicates', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('text/turtle', 'http://example.org/', streamifyString('<a> _:b <c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://example.org/a'), DF.blankNode('b'), DF.namedNode('http://example.org/c')),
        ]);
    });

    it('should parse text/n3 streams with literal subjects', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('text/n3', 'http://example.org/', streamifyString('"s"@en <p> "o". "t"^^<type> <p> "u".')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.literal('s', 'en'), DF.namedNode('http://example.org/p'), DF.literal('o')),
          DF.quad(DF.literal('t', DF.namedNode('http://example.org/type')), DF.namedNode('http://example.org/p'), DF.literal('u')),
        ]);
    });

    it('should parse application/n-triples streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('application/n-triples', 'http://example.org/', streamifyString('<http://ex.org/a> <http://ex.org/b> <http://ex.org/c>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://ex.org/a'), DF.namedNode('http://ex.org/b'), DF.namedNode('http://ex.org/c')),
        ]);
    });

    it('should parse application/n-quads streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('application/n-quads', 'http://example.org/', streamifyString('<http://ex.org/a> <http://ex.org/b> <http://ex.org/c> <http://ex.org/d>.')))).resolves
        .toEqualRdfQuadArray([
          DF.quad(DF.namedNode('http://ex.org/a'), DF.namedNode('http://ex.org/b'), DF.namedNode('http://ex.org/c'), DF.namedNode('http://ex.org/d')),
        ]);
    });

    it('should parse application/rdf+xml streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('application/rdf+xml', 'http://example.org/', streamifyString(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax" />

</rdf:RDF>`)))).resolves
        .toEqualRdfQuadArray([
          DF.quad(
            DF.namedNode('http://www.w3.org/TR/rdf-syntax-grammar'),
            DF.namedNode('http://purl.org/dc/elements/1.1/title'),
            DF.literal('RDF1.1 XML Syntax'),
          ),
        ]);
    });

    it('should parse application/ld+json streams', async() => {
      await expect(arrayifyStream(Util.parseRdfRaw('application/ld+json', 'http://example.org/', streamifyString(`{
  "@id": "abc",
  "http://ex.org/p": "value"
}`)))).resolves
        .toEqualRdfQuadArray([
          DF.quad(
            DF.namedNode('http://example.org/abc'),
            DF.namedNode('http://ex.org/p'),
            DF.literal('value'),
          ),
        ]);
    });
  });

  describe('#fetchRdf', () => {
    it('should fetch a ttl document', async() => {
      const response = await Util.fetchRdf('http://example.org/abc.ttl');
      expect(response[0]).toBe('http://example.org/abc.ttl');
      await expect(arrayifyStream(response[1])).resolves.toEqualRdfQuadArray([
        DF.quad(
          DF.namedNode('http://example.org/a'),
          DF.namedNode('http://example.org/b'),
          DF.namedNode('http://example.org/c'),
        ),
      ]);
    });
  });

  describe('#licenseToUri', () => {
    it('should convert the MIT license to its URI', () => {
      return expect(Util.licenseToUri('MIT')).toBe('http://opensource.org/licenses/MIT');
    });
  });
});
