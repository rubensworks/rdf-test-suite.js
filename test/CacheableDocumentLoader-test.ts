import {CacheableDocumentLoader} from "../lib/CacheableDocumentLoader";
import {Util} from "../lib/Util";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');

describe('CacheableDocumentLoader', () => {

  it('should store the provided cachePath', () => {
    return expect((<any> new CacheableDocumentLoader('abc')).cachePath).toEqual('abc');
  });

  it('should call Util.fetchCached when load is called', async () => {
    const loader = new CacheableDocumentLoader('abc');
    Util.fetchCached = jest.fn(async (url: string, cachePath?: string) => {
      return { body: streamifyString('{ "a": "b" }') };
    });
    expect(await loader.load('url')).toEqual({ a: 'b' });
    expect(Util.fetchCached).toBeCalledWith('url', 'abc');
    expect(Util.fetchCached).toHaveBeenCalledTimes(1);
  });

});
