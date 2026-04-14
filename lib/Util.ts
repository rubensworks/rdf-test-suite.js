import { createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import type * as RDF from '@rdfjs/types';
// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
import isStream = require('is-stream');
import { JsonLdParser } from 'jsonld-streaming-parser';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { DocumentLoaderCached } from './DocumentLoaderCached';
import { GeneralizedN3StreamParser } from './GeneralizedN3StreamParser';

/**
 * Utility functions
 */
// eslint-disable-next-line ts/no-extraneous-class
export class Util {
  public static colorReset = '\x1B[0m';
  public static colorRed = '\x1B[31m';
  public static colorGreen = '\x1B[32m';
  public static colorYellow = '\x1B[33m';
  public static colorBlue = '\x1B[34m';
  public static colorMagenta = '\x1B[35m';
  public static colorCyan = '\x1B[36m';
  public static colorGray = '\x1B[90m';

  protected static readonly extensionToContentType: Record<string, string> = {
    jsonld: 'application/ld+json',
    nq: 'application/n-quads',
    nt: 'application/n-triples',
    srj: 'application/sparql-results+json',
    srx: 'application/sparql-results+xml',
    ttl: 'text/turtle',
  };

  /**
   * Determine the content type of the given URL based on the headers.
   * @param {string} url The URL to get the content type from.
   * @param {Headers} headers The headers of the given URL.
   * @return {string} The content type.
   */
  public static identifyContentType(url: string, headers: Headers): string {
    const contentType = headers.get('Content-Type');
    return (contentType && !contentType.includes('application/octet-stream') ? contentType : false) ||
      Util.extensionToContentType[url.slice(url.lastIndexOf('.') + 1)] ||
      'unknown';
  }

  /**
   * Convert https to http
   * @param {string} url A URL.
   * @return {string} An http URL.
   */
  public static normalizeBaseUrl(url: string): string {
    if (url.startsWith('https://')) {
      return url.replace('https', 'http');
    }
    return url;
  }

  /**
   * Fetch the given RDF document and parse it.
   * @param {string} url A URL.
   * @param {IFetchOptions} options Options for fetching.
   * @return {Promise<[string , Stream]>} A promise resolving to a pair of a URL and a parsed RDF stream.
   */
  public static async fetchRdf(url: string, options: IFetchOptions = {}): Promise<[string, RDF.Stream]> {
    const response = await Util.fetchCached(url, options);
    const contentType = Util.identifyContentType(response.url, response.headers);
    const baseIri = options.normalizeUrl ? Util.normalizeBaseUrl(response.url) : response.url;
    return [ response.url, Util.parseRdfRaw(contentType, baseIri, response.body, options) ];
  }

  /**
   * Parses RDF based on the content type.
   * @param {string} contentType The content type of the given text stream.
   * @param {string} baseIRI The base IRI of the stream.
   * @param {NodeJS.ReadableStream} data Text stream in a certain RDF serialization.
   * @param {IFetchOptions} options Options for fetching.
   * @return {Stream} A parsed RDF stream.
   */
  public static parseRdfRaw(
    contentType: string,
    baseIRI: string,
    data: NodeJS.ReadableStream,
    options: IFetchOptions = {},
  ): RDF.Stream {
    if (contentType.includes('application/x-turtle') ||
      contentType.includes('text/turtle') ||
      contentType.includes('application/n-triples') ||
      contentType.includes('application/n-quads') ||
      contentType.includes('application/trig')) {
      return data.pipe(new GeneralizedN3StreamParser({ baseIRI, format: contentType }));
    }
    if (contentType.includes('application/rdf+xml')) {
      return data.pipe(new RdfXmlParser({ baseIRI }));
    }
    if (contentType.includes('application/ld+json')) {
      const documentLoader = new DocumentLoaderCached(options);
      return data.pipe(new JsonLdParser({ baseIRI, documentLoader }));
    }
    if (baseIRI.endsWith('.ttl')) {
      return data.pipe(new GeneralizedN3StreamParser({ baseIRI, format: 'text/turtle' }));
    }
    if (baseIRI.endsWith('.trig')) {
      return data.pipe(new GeneralizedN3StreamParser({ baseIRI, format: 'application/trig' }));
    }

    throw new Error(`Could not parse the RDF serialization ${contentType} on ${baseIRI}`);
  }

  /**
   * Fetch the given URL or retrieve it from a local file cache.
   * @param {string} url The URL to fetch.
   * @param {IFetchOptions} options Options for fetching.
   * @param {RequestInit} init Fetch init options.
   * @return {Promise<IFetchResponse>} A promise resolving to the response.
   */
  public static async fetchCached(
    url: string,
    options: IFetchOptions = {},
    init?: RequestInit,
  ): Promise<IFetchResponse> {
    // First check local file mappings
    if (options.urlToFileMappings) {
      for (const urlToFileMapping of options.urlToFileMappings) {
        if (url.startsWith(urlToFileMapping.url)) {
          let pathSuffix = url.slice(urlToFileMapping.url.length);

          // Remove hashes from path
          const hashPos = pathSuffix.indexOf('#');
          if (hashPos >= 0) {
            pathSuffix = pathSuffix.slice(0, Math.max(0, hashPos));
          }

          // Resolve file path
          const filePath = urlToFileMapping.path + pathSuffix;
          if (!existsSync(filePath)) {
            throw new Error(`Could not find file ${filePath}`);
          }
          return {
            body: createReadStream(filePath),
            headers: new Headers({}),
            url: urlToFileMapping.url + pathSuffix,
          };
        }
      }
    }

    const encodedUrl = encodeURIComponent(url);
    const cachePathLocal: string = options.cachePath && encodedUrl.length <= 255 ?
      options.cachePath + encodedUrl :
      null;
    if (cachePathLocal && existsSync(cachePathLocal)) {
      // Read from cache
      return {
        body: createReadStream(cachePathLocal),
        headers: new Headers(JSON.parse(readFileSync(`${cachePathLocal}.headers`, { encoding: 'utf8' })) as HeadersInit),
        url: readFileSync(`${cachePathLocal}.url`, { encoding: 'utf8' }),
      };
    }
    // Do actual fetch
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Could not find ${url}`);
    }
    /* istanbul ignore next */
    const body: NodeJS.ReadableStream = isStream(response.body) || response.body === null ?
          response.body as unknown as NodeJS.ReadableStream :
      new ReadableWebToNodeStream(response.body);
    const body1 = body.pipe(new PassThrough());
    const body2 = body.pipe(new PassThrough());

    // Remove unneeded headers (copy to make sure the Headers object is not immutable)
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');

    if (cachePathLocal) {
      // Save in cache
      const writeStream = createWriteStream(cachePathLocal, 'utf8');
      body1.pipe(writeStream);
      // To fix the problem of files being empty sometimes
      await new Promise(resolve => setImmediate(resolve));
      try {
        writeFileSync(`${cachePathLocal}.url`, response.url || url);
        const headersRaw: Record<string, string> = {};
        for (const [key, value] of headers) {
          headersRaw[key] = value;
        }
        writeFileSync(`${cachePathLocal}.headers`, JSON.stringify(headersRaw));
      } catch (error) {
        // Silently ignore errors if name is too long
        if ((error as NodeJS.ErrnoException).code === 'ENAMETOOLONG') {
          // eslint-disable-next-line no-console
          console.error(String(error));
        } else {
          throw error;
        }
      }
    }

    return {
      body: body2,
      headers,
      url: response.url || url,
    };
  }

  /**
   * Resolve all values in a hash.
   * @param {{[p: string]: Promise<T>}} data A hash with promise values.
   * @return {Promise<{[p: string]: T}>} A hash with resolved promise values.
   */
  public static async promiseValues<T>(data: Record<string, Promise<T>>): Promise<Record<string, T>> {
    const newData: Record<string, T> = {};
    for (const key in data) {
      newData[key] = await data[key];
    }
    return newData;
  }

  /**
   * Convert a license string to a URI.
   * @param {string} license A license string.
   * @return {string} A license URI.
   */
  public static licenseToUri(license: string): string {
    // TODO: make this more error-prone like here:
    // https://github.com/LinkedSoftwareDependencies/npm-extraction-server/blob/master/lib/npm/NpmContext.js#L151
    return `http://opensource.org/licenses/${license}`;
  }

  /**
   * Return a string in a given color
   * @param str The string that should be printed in
   * @param color A given color
   */
  public static withColor(str: any, color: string): string {
    return `${color}${str}${Util.colorReset}`;
  }
}

/**
 * A fetch response.
 */
export interface IFetchResponse {
  body: NodeJS.ReadableStream;
  headers: Headers;
  url: string;
}

export interface IFetchOptions {
  /**
   * The base directory to cache files in. If falsy, then no cache will be used.
   */
  cachePath?: string;
  /**
   * If the base URL should be converted from https to http.
   */
  normalizeUrl?: boolean;
  /**
   * URL to local path mapping.
   */
  urlToFileMappings?: { url: string; path: string }[];
}
