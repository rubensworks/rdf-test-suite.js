import {createReadStream, existsSync, readFileSync, ReadStream, writeFileSync} from "fs";
import * as RDF from "rdf-js";
import {RdfXmlParser} from "rdfxml-streaming-parser";
import {GeneralizedN3StreamParser} from "./GeneralizedN3StreamParser";
// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');

/**
 * Utility functions
 */
export class Util {

  protected static readonly EXTENSION_TO_CONTENTTYPE: {[extension: string]: string} = {
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
    return (contentType && contentType.indexOf('application/octet-stream') < 0 ? contentType : false)
      || Util.EXTENSION_TO_CONTENTTYPE[url.substr(url.lastIndexOf('\.') + 1)]
      || 'unknown';
  }

  /**
   * Convert https to http
   * @param {string} url A URL.
   * @return {string} An http URL.
   */
  public static normalizeBaseUrl(url: string) {
    if (url.startsWith('https://')) {
      return url.replace('https', 'http');
    }
    return url;
  }

  /**
   * Fetch the given RDF document and parse it.
   * @param {string} url A URL.
   * @param {string} cachePath The base directory to cache files in. If falsy, then no cache will be used.
   * @param {boolean} normalizeUrl If the base URL should be converted from https to http.
   * @return {Promise<[string , Stream]>} A promise resolving to a pair of a URL and a parsed RDF stream.
   */
  public static async fetchRdf(url: string, cachePath?: string, normalizeUrl?: boolean): Promise<[string, RDF.Stream]> {
    const response = await Util.fetchCached(url, cachePath);
    const contentType = Util.identifyContentType(response.url, response.headers);
    return [response.url, await Util.parseRdfRaw(contentType,
      normalizeUrl ? Util.normalizeBaseUrl(response.url) : response.url, response.body)];
  }

  /**
   * Parses RDF based on the content type.
   * @param {string} contentType The content type of the given text stream.
   * @param {string} baseIRI The base IRI of the stream.
   * @param {NodeJS.ReadableStream} data Text stream in a certain RDF serialization.
   * @return {Stream} A parsed RDF stream.
   */
  public static parseRdfRaw(contentType: string, baseIRI: string,
                            data: NodeJS.ReadableStream): RDF.Stream {
    if (contentType.indexOf('application/x-turtle') >= 0
      || contentType.indexOf('text/turtle') >= 0
      || contentType.indexOf('application/n-triples') >= 0
      || contentType.indexOf('application/n-quads') >= 0) {
      return data.pipe(new GeneralizedN3StreamParser({ baseIRI }));
    }
    if (contentType.indexOf('application/rdf+xml') >= 0) {
      return data.pipe(new RdfXmlParser({ baseIRI }));
    }

    throw new Error(`Could not parse the RDF serialization ${contentType} on ${baseIRI}`);
  }

  /**
   * Fetch the given URL or retrieve it from a local file cache.
   * @param {string} url The URL to fetch.
   * @param {string} cachePath The base directory to cache files in. If falsy, then no cache will be used.
   * @return {Promise<IFetchResponse>} A promise resolving to the response.
   */
  public static async fetchCached(url: string, cachePath?: string): Promise<IFetchResponse> {
    const cachePathLocal: string = cachePath ? cachePath + encodeURIComponent(url) : null;
    if (cachePathLocal && existsSync(cachePathLocal)) {
      // Read from cache
      return {
        body: createReadStream(cachePathLocal),
        headers: new Headers(JSON.parse(readFileSync(cachePathLocal + '.headers', { encoding: 'utf8' }))),
        url: readFileSync(cachePathLocal + '.url', { encoding: 'utf8' }),
      };
    } else {
      // Do actual fetch
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not find ${url}`);
      }
      const bodyString = await response.text();

      if (cachePathLocal) {
        // Save in cache
        writeFileSync(cachePathLocal, bodyString);
        writeFileSync(cachePathLocal + '.url', response.url);
        const headersRaw: any = {};
        response.headers.forEach((value: string, key: string) => headersRaw[key] = value);
        writeFileSync(cachePathLocal + '.headers', JSON.stringify(headersRaw));
      }

      return {
        body: streamifyString(bodyString),
        headers: response.headers,
        url: response.url,
      };
    }
  }

  /**
   * Resolve all values in a hash.
   * @param {{[p: string]: Promise<T>}} data A hash with promise values.
   * @return {Promise<{[p: string]: T}>} A hash with resolved promise values.
   */
  public static async promiseValues<T>(data: {[id: string]: Promise<T>}): Promise<{[id: string]: T}> {
    const newData: {[id: string]: T} = {};
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
  public static licenseToUri(license: string) {
    // TODO: make this more error-prone like here:
    // https://github.com/LinkedSoftwareDependencies/npm-extraction-server/blob/master/lib/npm/NpmContext.js#L151
    return 'http://opensource.org/licenses/' + license;
  }

}

/**
 * A fetch response.
 */
export interface IFetchResponse {
  body: ReadStream;
  headers: Headers;
  url: string;
}
