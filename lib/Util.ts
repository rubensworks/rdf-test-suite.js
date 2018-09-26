import {createReadStream, existsSync, readFileSync, ReadStream, writeFileSync} from "fs";
// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');

/**
 * Utility functions
 */
export class Util {

  protected static readonly EXTENSION_TO_CONTENTTYPE: {[extension: string]: string} = {
    nt: 'application/n-triples',
    srj: 'application/sparql-results+json',
    srx: 'application/sparql-results+xml',
  };

  /**
   * Determine the content type of the given URL based on the headers.
   * @param {string} url The URL to get the content type from.
   * @param {Headers} headers The headers of the given URL.
   * @return {string} The content type.
   */
  public static identifyContentType(url: string, headers: Headers): string {
    return headers.get('Content-Type') || Util.EXTENSION_TO_CONTENTTYPE[url
      .substr(url.lastIndexOf('\.') + 1)] || 'unknown';
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

}

/**
 * A fetch response.
 */
export interface IFetchResponse {
  body: ReadStream;
  headers: Headers;
  url: string;
}
