import {createReadStream, createWriteStream, existsSync, readFileSync, writeFileSync} from "fs";
import {JsonLdParser} from "jsonld-streaming-parser";
import * as RDF from "@rdfjs/types";
import {RdfXmlParser} from "rdfxml-streaming-parser";
import {PassThrough} from "stream";
import {DocumentLoaderCached} from "./DocumentLoaderCached";
import {GeneralizedN3StreamParser} from "./GeneralizedN3StreamParser";
import {ReadableWebToNodeStream} from 'readable-web-to-node-stream';

// tslint:disable-next-line:no-var-requires
const isStream = require('is-stream');

/**
 * Utility functions
 */
export class Util {

  public static COLOR_RESET: string = '\x1b[0m';
  public static COLOR_RED: string = '\x1b[31m';
  public static COLOR_GREEN: string = '\x1b[32m';
  public static COLOR_YELLOW: string = '\x1b[33m';
  public static COLOR_BLUE: string = '\x1b[34m';
  public static COLOR_MAGENTA: string = '\x1b[35m';
  public static COLOR_CYAN: string = '\x1b[36m';
  public static COLOR_GRAY: string = '\x1b[90m';

  protected static readonly EXTENSION_TO_CONTENTTYPE: {[extension: string]: string} = {
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
   * @param {IFetchOptions} options Options for fetching.
   * @return {Promise<[string , Stream]>} A promise resolving to a pair of a URL and a parsed RDF stream.
   */
  public static async fetchRdf(url: string, options: IFetchOptions = {}): Promise<[string, RDF.Stream]> {
    const response = await Util.fetchCached(url, options);
    const contentType = Util.identifyContentType(response.url, response.headers);
    return [response.url, Util.parseRdfRaw(contentType,
      options.normalizeUrl ? Util.normalizeBaseUrl(response.url) : response.url, response.body, options)];
  }

  /**
   * Parses RDF based on the content type.
   * @param {string} contentType The content type of the given text stream.
   * @param {string} baseIRI The base IRI of the stream.
   * @param {NodeJS.ReadableStream} data Text stream in a certain RDF serialization.
   * @param {IFetchOptions} options Options for fetching.
   * @return {Stream} A parsed RDF stream.
   */
  public static parseRdfRaw(contentType: string, baseIRI: string,
                            data: NodeJS.ReadableStream, options: IFetchOptions = {}): RDF.Stream {
    if (contentType.indexOf('application/x-turtle') >= 0
      || contentType.indexOf('text/turtle') >= 0
      || contentType.indexOf('application/n-triples') >= 0
      || contentType.indexOf('application/n-quads') >= 0) {
      return data.pipe(new GeneralizedN3StreamParser({ baseIRI, format: contentType,  }));
    }
    if (contentType.indexOf('application/rdf+xml') >= 0) {
      return data.pipe(new RdfXmlParser({ baseIRI }));
    }
    if (contentType.indexOf('application/ld+json') >= 0) {
      const documentLoader = new DocumentLoaderCached(options);
      return data.pipe(new JsonLdParser({ baseIRI, documentLoader }));
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
  public static async fetchCached(url: string, options: IFetchOptions = {},
                                  init?: RequestInit): Promise<IFetchResponse> {
    // First check local file mappings
    if (options.urlToFileMappings) {
      for (const urlToFileMapping of options.urlToFileMappings) {
        if (url.startsWith(urlToFileMapping.url)) {
          let pathSuffix = url.substr(urlToFileMapping.url.length);

          // Remove hashes from path
          const hashPos = pathSuffix.indexOf('#');
          if (hashPos >= 0) {
            pathSuffix = pathSuffix.substr(0, hashPos);
          }

          // Resolve file path
          const filePath = urlToFileMapping.path + pathSuffix;
          if (!existsSync(filePath)) {
            throw new Error(`Could not find file ` + filePath);
          }
          return {
            body: createReadStream(filePath),
            headers: new Headers({}),
            url: urlToFileMapping.url + pathSuffix,
          };
        }
      }
    }

    const cachePathLocal: string = options.cachePath ? options.cachePath + encodeURIComponent(url) : null;
    if (cachePathLocal && existsSync(cachePathLocal)) {
      // Read from cache
      return {
        body: createReadStream(cachePathLocal),
        headers: new Headers(JSON.parse(readFileSync(cachePathLocal + '.headers', { encoding: 'utf8' }))),
        url: readFileSync(cachePathLocal + '.url', { encoding: 'utf8' }),
      };
    } else {
      // Do actual fetch
      const response = await fetch(url, init);
      if (!response.ok) {
        throw new Error(`Could not find ${url}`);
      }
      /* istanbul ignore next */
      const body: NodeJS.ReadableStream = isStream(response.body) || response.body === null ?
          <any> response.body :
          new ReadableWebToNodeStream(response.body);
      const body1 = body.pipe(new PassThrough());
      const body2 = body.pipe(new PassThrough());

      // Remove unneeded headers (copy to make sure the Headers object is not immutable)
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');

      if (cachePathLocal) {
        // Save in cache
        const writeStream = createWriteStream(cachePathLocal);
        body1.pipe(writeStream);
        // Due to an unknown reason, large streams don't seem to emit a close event, which causes program hanging.
        /*await new Promise((resolve, reject) => {
          writeStream.on('close', resolve);
          writeStream.on('error', reject);
        });*/
        writeFileSync(cachePathLocal + '.url', response.url || url);
        const headersRaw: any = {};
        headers.forEach((value: string, key: string) => headersRaw[key] = value);
        writeFileSync(cachePathLocal + '.headers', JSON.stringify(headersRaw));
      }

      return {
        body: body2,
        headers: headers,
        url: response.url || url,
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

  /**
   * Return a string in a given color
   * @param str The string that should be printed in
   * @param color A given color
   */
  public static withColor(str: any, color: string) {
    return `${color}${str}${Util.COLOR_RESET}`;
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
  urlToFileMappings?: { url: string, path: string }[];
}
