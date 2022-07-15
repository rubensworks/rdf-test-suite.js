import "cross-fetch/polyfill";
import "jest-rdf";
import {DocumentLoaderCached} from "../lib/DocumentLoaderCached";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'http://example.org/':
    body = streamifyString('{ "a": "b" }');
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200 }));
};

describe('DocumentLoaderCached', () => {

  const loader = new DocumentLoaderCached({});

  describe('#load', () => {

    it('should reject on 404s', () => {
      return expect(loader.load('404')).rejects.toBeTruthy();
    });

    it('should load documents', async () => {
      const spy = jest.spyOn(<any> global, 'fetch');

      const response1 = await loader.load('http://example.org/');
      expect(response1).toEqual({ a: 'b' });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

});
