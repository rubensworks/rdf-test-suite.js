import { Parser } from 'n3';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import {
  TestCaseGraphStoreProtocol,
  TestCaseGraphStoreProtocolHandler,
} from '../../../lib/testcase/sparql/TestCaseGraphStoreProtocol';

const endpoint = 'http://example.org/gsp';

let requests: { url: string; init: RequestInit }[];
let responses: Record<string, { status: number; headers?: Record<string, string>; body?: string }>;

// Mock fetch
(<any> globalThis).fetch = (url: string, init: RequestInit) => {
  requests.push({ url, init });
  const response = responses[url];
  if (!response) {
    return Promise.reject(new Error(`Fetch error for ${url}`));
  }
  const result = new Response(response.body ?? null, <any> {
    headers: new Headers(response.headers ?? {}),
    status: response.status,
  });
  if (!response.headers?.['content-type']) {
    result.headers.delete('content-type');
  }
  return Promise.resolve(result);
};

const PREFIXES = `@prefix mf: <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix cnt: <http://www.w3.org/2011/content#> .
@prefix ht: <http://www.w3.org/2011/http#> .
@prefix hts: <http://www.w3.org/2011/http-statusCodes#> .
`;

async function toResource(turtle: string): Promise<Resource> {
  const objectLoader = new RdfObjectLoader({ context: require('../../../lib/context-manifest.json') });
  await objectLoader.importArray(new Parser().parse(PREFIXES + turtle));
  return objectLoader.resources['http://example.org/test'];
}

const testCaseData = {
  approval: null,
  approvedBy: null,
  comment: null,
  name: 'graph store protocol test',
  types: [ 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#GraphStoreProtocolTest' ],
  uri: 'http://example.org/test',
};

const TURTLE = `<http://example.org/s> <http://example.org/p> <http://example.org/o> .`;

describe('TestCaseGraphStoreProtocolHandler', () => {
  const handler = new TestCaseGraphStoreProtocolHandler();

  beforeEach(() => {
    requests = [];
    responses = { [endpoint]: { status: 200 }, [`${endpoint}/graph`]: { status: 200 }};
  });

  describe('#resourceToTestCase', () => {
    it('should require an mf:action', async() => {
      const resource = await toResource(`<http://example.org/test> mf:name "gsp test" .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing mf:action');
    });

    it('should require ht:requests', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ a ht:Connection ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:requests');
    });

    it('should require at least one ht:Request', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ ht:requests () ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:Request entries');
    });

    it('should require ht:requests to be a list', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests <http://example.org/requests>
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:Request entries');
    });

    it('should require a ht:absolutePath', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ ht:requests ([ ht:methodName "GET" ]) ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:absolutePath');
    });

    it('should require a ht:methodName', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ ht:requests ([ ht:absolutePath "/gsp" ]) ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:methodName');
    });

    it('should require a ht:resp', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([ ht:absolutePath "/gsp" ; ht:methodName "GET" ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:resp');
    });

    it('should require an mf:expectedStatus', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([ ht:absolutePath "/gsp" ; ht:methodName "GET" ; ht:resp [ a ht:Response ] ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing mf:expectedStatus');
    });

    it('should reject an mf:expectedStatus outside of the status code vocabulary', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/gsp" ; ht:methodName "GET" ;
          ht:resp [ mf:expectedStatus <http://example.org/status> ]
        ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData))
        .rejects.toThrow('Unsupported mf:expectedStatus');
    });

    it('should reject an unknown mf:expectedStatus of the status code vocabulary', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/gsp" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:ImATeapot ]
        ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData))
        .rejects.toThrow('Unsupported mf:expectedStatus');
    });

    it('should produce a TestCaseGraphStoreProtocol', async() => {
      const resource = await toResource(`<http://example.org/test>
        mf:requires mf:IndirectGraphIdentification ;
        mf:action [
          ht:requests ([
            ht:absolutePath "/gsp?default" ; ht:methodName "GET" ;
            ht:resp [ mf:expectedStatus hts:OK, hts:StatusCode3xx ]
          ])
        ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase).toBeInstanceOf(TestCaseGraphStoreProtocol);
      expect(testCase.type).toBe('sparql');
      expect(testCase.requiredFeatures)
        .toEqual([ 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#IndirectGraphIdentification' ]);
      expect(testCase.requests).toEqual([{
        absolutePath: '/gsp?default',
        method: 'GET',
        headers: [],
        expectedStatuses: [ 200 ],
        expectedStatusClasses: [ 3 ],
        expectedHeaders: [],
      }]);
    });

    it('should produce a TestCaseGraphStoreProtocol with headers, bodies and a location', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/gsp" ; ht:methodName "POST" ;
          ht:body [ a cnt:ContentAsText ; cnt:characterEncoding "UTF-8" ; cnt:chars "${TURTLE}" ] ;
          ht:headers ([ a ht:RequestHeader ; ht:fieldName "content-type" ; ht:fieldValue "text/turtle" ]) ;
          ht:resp [
            mf:expectedStatus hts:Created ;
            mf:expectedLocation "$LOCATION$" ;
            ht:headers ([ a ht:ResponseHeader ; ht:fieldName "content-type" ; ht:fieldValue "text/turtle" ]) ;
            ht:body [ a cnt:ContentAsText ; cnt:characterEncoding "UTF-8" ; cnt:chars "${TURTLE}" ]
          ]
        ])
      ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase.requests).toEqual([{
        absolutePath: '/gsp',
        method: 'POST',
        headers: [[ 'content-type', 'text/turtle' ]],
        body: { chars: TURTLE, characterEncoding: 'UTF-8' },
        expectedStatuses: [ 201 ],
        expectedStatusClasses: [],
        expectedLocation: '$LOCATION$',
        expectedHeaders: [[ 'content-type', 'text/turtle' ]],
        expectedBody: { chars: TURTLE, characterEncoding: 'UTF-8' },
      }]);
    });

    it('should ignore ht:headers that are not a list', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/gsp" ; ht:methodName "GET" ;
          ht:headers <http://example.org/headers> ;
          ht:resp [ mf:expectedStatus hts:OK ]
        ])
      ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase.requests[0].headers).toEqual([]);
    });
  });

  describe('#test', () => {
    async function toTestCase(requestsTurtle: string, requires = ''): Promise<TestCaseGraphStoreProtocol> {
      return handler.resourceToTestCase(
        await toResource(`<http://example.org/test> ${requires} mf:action [ ht:requests (${requestsTurtle}) ] .`),
        testCaseData,
      );
    }

    const okRequest = `[
      ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
    ]`;

    it('should require an endpoint', async() => {
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, {}))
        .rejects.toThrow('require an endpoint from startGraphStoreEndpoint');
    });

    it('should skip a test that requires an unsupported feature', async() => {
      const testCase = await toTestCase(okRequest, 'mf:requires mf:TimeTravel ;');
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
        .rejects.toThrow('Unsupported graph store protocol features');
    });

    it('should run a test that requires supported features', async() => {
      const testCase = await toTestCase(
        okRequest,
        'mf:requires mf:DirectGraphIdentification, mf:IndirectGraphIdentification, mf:POSTGraphCreation ;',
      );
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
    });

    it('should delete the addressed graphs before sending the requests', async() => {
      const testCase = await toTestCase(`${okRequest} ${okRequest}`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

      expect(requests).toEqual([
        { url: `${endpoint}/graph`, init: { method: 'DELETE' }},
        { url: `${endpoint}/graph`, init: { method: 'GET', headers: [], redirect: 'manual' }},
        { url: `${endpoint}/graph`, init: { method: 'GET', headers: [], redirect: 'manual' }},
      ]);
    });

    it('should not delete the graph store itself', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/gsp" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

      expect(requests).toHaveLength(1);
      expect(requests[0].init.method).toBe('GET');
    });

    it('should not delete graphs that are only known while the test is running', async() => {
      responses[endpoint] = { status: 201, headers: { location: `${endpoint}/created` }};
      responses[`${endpoint}?graph=${endpoint}/created`] = { status: 200 };
      const testCase = await toTestCase(`[
        ht:absolutePath "/gsp" ; ht:methodName "POST" ;
        ht:resp [ mf:expectedStatus hts:Created ; mf:expectedLocation "$LOCATION$" ]
      ] [
        ht:absolutePath "/gsp?graph=$LOCATION$" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

      expect(requests.filter(request => request.init.method === 'DELETE')).toHaveLength(0);
    });

    it('should ignore failures while deleting the addressed graphs', async() => {
      responses = {};
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
        .rejects.toThrow('Could not send a GET request to');
    });

    it('should reject a request path outside of the endpoint', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/other" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
        .rejects.toThrow('to start with /gsp');
    });

    it('should reject a request path that only shares a prefix with the endpoint', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/gspother" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
        .rejects.toThrow('to start with /gsp');
    });

    it('should send the body of a request', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/gsp/graph" ; ht:methodName "PUT" ;
        ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "${TURTLE}" ] ;
        ht:headers ([ ht:fieldName "content-type" ; ht:fieldValue "text/turtle" ]) ;
        ht:resp [ mf:expectedStatus hts:OK ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

      const put = requests.find(request => request.init.method === 'PUT');
      expect(put.init.headers).toEqual([[ 'content-type', 'text/turtle' ]]);
      expect(Buffer.from(<ArrayBuffer> put.init.body).toString('utf8')).toBe(TURTLE);
    });

    it('should reject an unexpected response status', async() => {
      responses[`${endpoint}/graph`] = { status: 404, body: 'Not found' };
      const testCase = await toTestCase(`[
        ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ;
        ht:resp [ mf:expectedStatus hts:OK, hts:StatusCode3xx ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
        .rejects.toThrow('Expected one of: 200, 3xx');
    });

    it('should accept a response status of an expected class', async() => {
      responses[`${endpoint}/graph`] = { status: 302 };
      const testCase = await toTestCase(`[
        ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ;
        ht:resp [ mf:expectedStatus hts:StatusCode3xx ]
      ]`);
      await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
    });

    describe('with an expected location', () => {
      const locationRequests = `[
        ht:absolutePath "/gsp" ; ht:methodName "POST" ;
        ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "<$LOCATION$> <http://example.org/p> 1 ." ] ;
        ht:resp [ mf:expectedStatus hts:Created ; mf:expectedLocation "$LOCATION$" ]
      ] [
        ht:absolutePath "/gsp?graph=$LOCATION$" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:OK ]
      ]`;

      it('should fill the location into the subsequent requests', async() => {
        responses[endpoint] = { status: 201, headers: { location: `${endpoint}/created` }};
        responses[`${endpoint}?graph=${endpoint}/created`] = { status: 200 };
        const testCase = await toTestCase(locationRequests);
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

        expect(requests[1].url).toBe(`${endpoint}?graph=${endpoint}/created`);
        expect(Buffer.from(<ArrayBuffer> requests[0].init.body).toString('utf8'))
          .toBe('<$LOCATION$> <http://example.org/p> 1 .');
      });

      it('should resolve a relative location', async() => {
        responses[endpoint] = { status: 201, headers: { location: 'created' }};
        responses[`${endpoint}?graph=http://example.org/created`] = { status: 200 };
        const testCase = await toTestCase(locationRequests);
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();

        expect(requests[1].url).toBe(`${endpoint}?graph=http://example.org/created`);
      });

      it('should reject a missing location', async() => {
        responses[endpoint] = { status: 201 };
        const testCase = await toTestCase(locationRequests);
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Missing Location response header for POST');
      });
    });

    describe('with expected headers', () => {
      function headerRequest(name: string, value: string): string {
        return `[
          ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ;
          ht:resp [
            mf:expectedStatus hts:OK ;
            ht:headers ([ ht:fieldName "${name}" ; ht:fieldValue "${value}" ])
          ]
        ]`;
      }

      it('should ignore the parameters of a content type', async() => {
        responses[`${endpoint}/graph`] = { status: 200, headers: { 'content-type': 'text/turtle' }};
        const testCase = await toTestCase(headerRequest('content-type', 'text/turtle; charset=utf-8'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a different content type', async() => {
        responses[`${endpoint}/graph`] = { status: 200, headers: { 'content-type': 'application/trig' }};
        const testCase = await toTestCase(headerRequest('content-type', 'text/turtle; charset=utf-8'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Invalid content-type response header');
      });

      it('should reject a missing content type', async() => {
        const testCase = await toTestCase(headerRequest('content-type', 'text/turtle'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Invalid content-type response header');
      });

      it('should compare other headers exactly', async() => {
        responses[`${endpoint}/graph`] = { status: 200, headers: { etag: 'W/1' }};
        const testCase = await toTestCase(headerRequest('etag', 'W/1'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a different value of another header', async() => {
        responses[`${endpoint}/graph`] = { status: 200, headers: { etag: 'W/2' }};
        const testCase = await toTestCase(headerRequest('etag', 'W/1'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Invalid etag response header');
      });
    });

    describe('with an expected body', () => {
      function bodyRequest(expected: string, contentType = 'text/turtle'): string {
        return `[
          ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ;
          ht:resp [
            mf:expectedStatus hts:OK ;
            ht:headers ([ ht:fieldName "content-type" ; ht:fieldValue "${contentType}" ]) ;
            ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "${expected}" ]
          ]
        ]`;
      }

      it('should accept an isomorphic graph', async() => {
        responses[`${endpoint}/graph`] = {
          status: 200,
          headers: { 'content-type': 'text/turtle' },
          body: `<http://example.org/s> <http://example.org/p> [ <http://example.org/q> 1 ] .`,
        };
        const testCase = await toTestCase(bodyRequest(
          `<http://example.org/s> <http://example.org/p> [ <http://example.org/q> 1 ] .`,
        ));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a non-isomorphic graph', async() => {
        responses[`${endpoint}/graph`] = {
          status: 200,
          headers: { 'content-type': 'text/turtle' },
          body: `<http://example.org/s> <http://example.org/p> <http://example.org/other> .`,
        };
        const testCase = await toTestCase(bodyRequest(TURTLE));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Invalid response body for GET');
      });

      it('should reject an unparsable response body', async() => {
        responses[`${endpoint}/graph`] = {
          status: 200,
          headers: { 'content-type': 'text/turtle' },
          body: 'this is not turtle',
        };
        const testCase = await toTestCase(bodyRequest(TURTLE));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Could not parse the actual response body');
      });

      it('should reject an unparsable expected body', async() => {
        responses[`${endpoint}/graph`] = {
          status: 200,
          headers: { 'content-type': 'application/unknown' },
          body: TURTLE,
        };
        const testCase = await toTestCase(bodyRequest(TURTLE, 'application/unknown'));
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Could not parse the expected response body');
      });

      it('should fall back to the request URL to determine the content type', async() => {
        responses[`${endpoint}/graph.ttl`] = { status: 200, body: TURTLE };
        const testCase = await toTestCase(`[
          ht:absolutePath "/gsp/graph.ttl" ; ht:methodName "GET" ;
          ht:resp [
            mf:expectedStatus hts:OK ;
            ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "${TURTLE}" ]
          ]
        ]`);
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a response without a content type', async() => {
        responses[`${endpoint}/graph`] = { status: 200, body: TURTLE };
        const testCase = await toTestCase(`[
          ht:absolutePath "/gsp/graph" ; ht:methodName "GET" ;
          ht:resp [
            mf:expectedStatus hts:OK ;
            ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "${TURTLE}" ]
          ]
        ]`);
        await expect(testCase.test(<any> {}, { graphStoreEndpoint: endpoint }))
          .rejects.toThrow('Could not parse the expected response body');
      });
    });
  });
});
