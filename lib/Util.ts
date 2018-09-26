import {existsSync, mkdirSync} from "fs";

const cachePath: string = process.cwd() + '/.rdf-test-cache/';
if (!existsSync(cachePath)) {
  mkdirSync(cachePath);
}

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

}
