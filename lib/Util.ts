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
