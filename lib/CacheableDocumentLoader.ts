import {Util} from "./Util";
// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

/**
 * A document loader that caches documents.
 */
export class CacheableDocumentLoader {

  private readonly cachePath: string;

  constructor(cachePath: string) {
    this.cachePath = cachePath;
  }

  public async load(url: string): Promise<any> {
    const fetchResponse = await Util.fetchCached(url, this.cachePath);
    return JSON.parse(await stringifyStream(fetchResponse.body));
  }

}