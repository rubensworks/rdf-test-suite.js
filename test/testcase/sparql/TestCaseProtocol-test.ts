import { Parser } from 'n3';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { TestCaseProtocol, TestCaseProtocolHandler } from '../../../lib/testcase/sparql/TestCaseProtocol';

const endpoint = 'http://example.org/sparql';

let requests: { url: string; init: RequestInit }[];
let responses: Record<string, { status: number; contentType?: string; body?: string }>;

// Mock fetch
(<any> globalThis).fetch = (url: string, init: RequestInit) => {
  requests.push({ url, init });
  const response = responses[url.split('?')[0]];
  if (!response) {
    return Promise.reject(new Error(`Fetch error for ${url}`));
  }
  return Promise.resolve(new Response(response.body ?? null, <any> {
    headers: new Headers(response.contentType ? { 'Content-Type': response.contentType } : {}),
    status: response.status,
  }));
};

const PREFIXES = `@prefix mf: <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix cnt: <http://www.w3.org/2011/content#> .
@prefix ht: <http://www.w3.org/2011/http#> .
@prefix hts: <http://www.w3.org/2011/http-statusCodes#> .
@prefix ut: <http://www.w3.org/2009/sparql/tests/test-update#> .
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
  name: 'protocol test',
  types: [ 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ProtocolTest' ],
  uri: 'http://example.org/test',
};

describe('TestCaseProtocolHandler', () => {
  const handler = new TestCaseProtocolHandler();

  beforeEach(() => {
    requests = [];
    responses = {
      [endpoint]: { status: 200, contentType: 'application/sparql-results+json', body: '{ "boolean": true }' },
    };
  });

  describe('#resourceToTestCase', () => {
    it('should require an mf:action', async() => {
      const resource = await toResource(`<http://example.org/test> mf:name "protocol test" .`);
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

    it('should require a ht:absolutePath', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ ht:requests ([ ht:methodName "GET" ]) ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:absolutePath');
    });

    it('should require a ht:methodName', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [ ht:requests ([ ht:absolutePath "/sparql/" ]) ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:methodName');
    });

    it('should require a ht:resp', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([ ht:absolutePath "/sparql/" ; ht:methodName "GET" ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:resp');
    });

    it('should require an mf:expectedStatus', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([ ht:absolutePath "/sparql/" ; ht:methodName "GET" ; ht:resp [ a ht:Response ] ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing mf:expectedStatus');
    });

    it('should reject an unsupported mf:expectedStatus', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/sparql/" ; ht:methodName "GET" ;
          ht:resp [ mf:expectedStatus <http://example.org/status> ]
        ])
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData))
        .rejects.toThrow('Unsupported mf:expectedStatus');
    });

    it('should produce a TestCaseProtocol', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/sparql/?query=ASK%20%7B%7D" ; ht:methodName "GET" ;
          ht:resp [ mf:expectedStatus hts:StatusCode2xx, hts:StatusCode3xx ; mf:expectedFormat "boolean" ; mf:expectedBoolean true ]
        ])
      ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase).toBeInstanceOf(TestCaseProtocol);
      expect(testCase.type).toBe('sparql');
      expect(testCase.requests).toEqual([{
        absolutePath: '/sparql/?query=ASK%20%7B%7D',
        method: 'GET',
        headers: [],
        expectedStatusClasses: [ 2, 3 ],
        expectedFormat: 'boolean',
        expectedBoolean: true,
      }]);
      expect(testCase.graphData).toEqual([]);
    });

    it('should ignore ht:headers that are not a list', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/sparql/" ; ht:methodName "GET" ;
          ht:headers <http://example.org/headers> ;
          ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
        ])
      ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase.requests[0].headers).toEqual([]);
    });

    it('should require ht:requests to be a list', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests <http://example.org/requests>
      ] .`);
      await expect(handler.resourceToTestCase(resource, testCaseData)).rejects.toThrow('Missing ht:Request entries');
    });

    it('should produce a TestCaseProtocol with headers and a body', async() => {
      const resource = await toResource(`<http://example.org/test> mf:action [
        ht:requests ([
          ht:absolutePath "/sparql/" ; ht:methodName "POST" ;
          ht:body [ a cnt:ContentAsText ; cnt:characterEncoding "UTF-8" ; cnt:chars "ASK {}" ] ;
          ht:headers ([ a ht:RequestHeader ; ht:fieldName "content-type" ; ht:fieldValue "application/sparql-query" ]) ;
          ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
        ])
      ] .`);
      const testCase = await handler.resourceToTestCase(resource, testCaseData);

      expect(testCase.requests).toEqual([{
        absolutePath: '/sparql/',
        method: 'POST',
        headers: [[ 'content-type', 'application/sparql-query' ]],
        body: { chars: 'ASK {}', characterEncoding: 'UTF-8' },
        expectedStatusClasses: [ 2 ],
      }]);
    });
  });

  describe('#test', () => {
    async function toTestCase(requestsTurtle: string, graphDataTurtle = ''): Promise<TestCaseProtocol> {
      return handler.resourceToTestCase(
        await toResource(`<http://example.org/test> ${graphDataTurtle} mf:action [ ht:requests (${requestsTurtle}) ] .`),
        testCaseData,
      );
    }

    const okRequest = `[
      ht:absolutePath "/sparql/?query=ASK%20%7B%7D" ; ht:methodName "GET" ;
      ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
    ]`;

    it('should require an endpoint', async() => {
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, {}))
        .rejects.toThrow('require an endpoint from startProtocolEndpoint');
    });

    it('should send the request to the endpoint', async() => {
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      expect(requests).toEqual([{
        url: `${endpoint}?query=ASK%20%7B%7D`,
        init: { method: 'GET', headers: [], redirect: 'manual' },
      }]);
    });

    it('should reject a request path outside of the endpoint', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/other/" ; ht:methodName "GET" ; ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
      ]`);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
        .rejects.toThrow('to start with /sparql/');
    });

    it('should reject a request that could not be sent', async() => {
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, { protocolEndpoint: 'http://example.org/unknown' }))
        .rejects.toThrow('Could not send a GET request to');
    });

    it('should reject an unexpected response status', async() => {
      responses[endpoint] = { status: 400, body: 'Bad request' };
      const testCase = await toTestCase(okRequest);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
        .rejects.toThrow('Invalid response status');
    });

    it('should send the requests in order', async() => {
      const testCase = await toTestCase(`${okRequest} ${okRequest}`);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      expect(requests).toHaveLength(2);
    });

    it('should encode a UTF-8 body', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/sparql/" ; ht:methodName "POST" ;
        ht:body [ cnt:characterEncoding "UTF-8" ; cnt:chars "ASK {}" ] ;
        ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
      ]`);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      expect(Buffer.from(<ArrayBuffer> requests[0].init.body).toString('utf8')).toBe('ASK {}');
    });

    it('should encode a UTF-16 body with a byte order mark', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/sparql/" ; ht:methodName "POST" ;
        ht:body [ cnt:characterEncoding "UTF-16" ; cnt:chars "ASK {}" ] ;
        ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
      ]`);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      expect(Buffer.from(<ArrayBuffer> requests[0].init.body).toString('utf16le')).toBe('﻿ASK {}');
    });

    it('should reject an unsupported character encoding', async() => {
      const testCase = await toTestCase(`[
        ht:absolutePath "/sparql/" ; ht:methodName "POST" ;
        ht:body [ cnt:characterEncoding "ISO-8859-1" ; cnt:chars "ASK {}" ] ;
        ht:resp [ mf:expectedStatus hts:StatusCode2xx ]
      ]`);
      await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
        .rejects.toThrow('Unsupported cnt:characterEncoding ISO-8859-1');
    });

    describe('with an expected format', () => {
      function formatRequest(format: string): string {
        return `[
          ht:absolutePath "/sparql/" ; ht:methodName "GET" ;
          ht:resp [ mf:expectedStatus hts:StatusCode2xx ; mf:expectedFormat "${format}" ]
        ]`;
      }

      it('should accept a matching content type', async() => {
        const testCase = await toTestCase(formatRequest('boolean'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should accept an RDF content type', async() => {
        responses[endpoint] = { status: 200, contentType: 'application/trig', body: '' };
        const testCase = await toTestCase(formatRequest('RDF'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should accept a tabular content type', async() => {
        responses[endpoint] = { status: 200, contentType: 'text/csv', body: '' };
        const testCase = await toTestCase(formatRequest('tabular'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a non-matching content type', async() => {
        responses[endpoint] = { status: 200, contentType: 'text/plain', body: 'true' };
        const testCase = await toTestCase(formatRequest('boolean'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Invalid response content type');
      });

      it('should reject a missing content type', async() => {
        responses[endpoint] = { status: 200 };
        const testCase = await toTestCase(formatRequest('boolean'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Invalid response content type');
      });

      it('should reject an unsupported format', async() => {
        const testCase = await toTestCase(formatRequest('unknown'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Unsupported mf:expectedFormat unknown');
      });
    });

    describe('with an expected boolean', () => {
      function booleanRequest(expected: string): string {
        return `[
          ht:absolutePath "/sparql/" ; ht:methodName "GET" ;
          ht:resp [ mf:expectedStatus hts:StatusCode2xx ; mf:expectedBoolean ${expected} ]
        ]`;
      }

      it('should accept a matching boolean', async() => {
        const testCase = await toTestCase(booleanRequest('true'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();
      });

      it('should reject a non-matching boolean', async() => {
        const testCase = await toTestCase(booleanRequest('false'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Invalid boolean response');
      });

      it('should reject an unparsable response', async() => {
        responses[endpoint] = { status: 200, contentType: 'text/plain', body: 'true' };
        const testCase = await toTestCase(booleanRequest('true'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Could not read a boolean result');
      });

      it('should reject a response that is not a boolean', async() => {
        responses[endpoint] = {
          status: 200,
          contentType: 'application/sparql-results+json',
          body: '{ "head": { "vars": [ "a" ] }, "results": { "bindings": [] } }',
        };
        const testCase = await toTestCase(booleanRequest('true'));
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Expected a boolean result, but got a result of type bindings');
      });
    });

    describe('with graph data', () => {
      const graphData = `ut:graphData [ ut:graph <GRAPH.ttl> ; rdfs:label "http://example.org/g" ] ;`;

      beforeEach(() => {
        responses['GRAPH.ttl'] = {
          status: 200,
          contentType: 'text/turtle',
          body: '<http://example.org/s> <http://example.org/p> <http://example.org/o> .',
        };
      });

      it('should load the graph data into the endpoint before the requests', async() => {
        const testCase = await toTestCase(okRequest, graphData);
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint })).resolves.toBeUndefined();

        expect(requests).toHaveLength(3);
        expect(requests[1].init.method).toBe('POST');
        expect(requests[1].init.body).toBe(`DROP SILENT ALL ;
INSERT DATA { GRAPH <http://example.org/g> { <http://example.org/s> <http://example.org/p> <http://example.org/o> . } }`);
      });

      it('should reject when the graph data could not be loaded', async() => {
        responses[endpoint] = { status: 400, body: 'Updates are not supported' };
        const testCase = await toTestCase(okRequest, graphData);
        await expect(testCase.test(<any> {}, { protocolEndpoint: endpoint }))
          .rejects.toThrow('Could not load the test data into');
      });
    });
  });
});
