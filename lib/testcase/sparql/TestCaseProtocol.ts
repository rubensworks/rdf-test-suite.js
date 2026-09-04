import type * as RDF from '@rdfjs/types';
import type { Resource } from 'rdf-object';
import { termToString } from 'rdf-string-ttl';
import { ErrorTest } from '../../ErrorTest';
import type { IFetchOptions } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine, IQueryResultBoolean } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';
import type { IQueryDataLink } from './TestCaseQueryEvaluation';
import { TestCaseQueryEvaluationHandler } from './TestCaseQueryEvaluation';
import { TestCaseUpdateEvaluationHandler } from './TestCaseUpdateEvaluation';

// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
const streamifyString = require('streamify-string');

/**
 * The path prefix that every ht:absolutePath in the SPARQL 1.1 Protocol manifest starts with.
 * It is replaced by the path of the endpoint under test.
 */
const MANIFEST_PATH_PREFIX = '/sparql/';

const STATUS_CODE_CLASS_REGEX = /^http:\/\/www\.w3\.org\/2011\/http-statusCodes#StatusCode(\d)xx$/u;

/**
 * The content types that are considered valid for each of the mf:expectedFormat values.
 */
const EXPECTED_FORMAT_CONTENT_TYPES: Record<string, string[]> = {
  boolean: [
    'application/sparql-results+json',
    'application/sparql-results+xml',
  ],
  tabular: [
    'application/sparql-results+json',
    'application/sparql-results+xml',
    'text/csv',
    'text/tab-separated-values',
  ],
  RDF: [
    'application/rdf+xml',
    'text/turtle',
    'application/x-turtle',
    'application/n-triples',
    'application/n-quads',
    'application/trig',
    'application/ld+json',
  ],
};

export interface IProtocolTestOptions {
  /** The SPARQL endpoint that the protocol requests are sent to. */
  protocolEndpoint?: string;
}

/**
 * A single HTTP request of a protocol test, together with its expected response.
 */
export interface IProtocolRequest {
  absolutePath: string;
  method: string;
  headers: [string, string][];
  body?: { chars: string; characterEncoding: string };
  expectedStatusClasses: number[];
  expectedFormat?: string;
  expectedBoolean?: boolean;
}

export interface ITestCaseProtocolProps {
  requests: IProtocolRequest[];
  graphData: RDF.Quad[];
  graphDataLinks: IQueryDataLink[];
}

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ProtocolTest.
 */
export class TestCaseProtocolHandler implements ITestCaseHandler<TestCaseProtocol> {
  /**
   * Interpret a single ht:Request resource, together with the ht:Response it is expected to produce.
   * @param request A ht:Request resource.
   * @param uri The URI of the test case the request belongs to, used for error reporting.
   */
  public static getRequest(request: Resource, uri: string): IProtocolRequest {
    if (!request.property.httpAbsolutePath) {
      throw new Error(`Missing ht:absolutePath in a ht:Request of ${uri}`);
    }
    if (!request.property.httpMethodName) {
      throw new Error(`Missing ht:methodName in a ht:Request of ${uri}`);
    }
    if (!request.property.httpResponse) {
      throw new Error(`Missing ht:resp in a ht:Request of ${uri}`);
    }
    const response = request.property.httpResponse;

    const headers: [string, string][] = [];
    for (const headerList of request.properties.httpHeaders) {
      for (const header of headerList.list ?? []) {
        headers.push([ header.property.httpFieldName.value, header.property.httpFieldValue.value ]);
      }
    }

    const expectedStatusClasses = response.properties.expectedStatus
      .map((status) => {
        const match = STATUS_CODE_CLASS_REGEX.exec(status.value);
        if (!match) {
          throw new Error(`Unsupported mf:expectedStatus ${status.value} in ${uri}`);
        }
        return Number.parseInt(match[1], 10);
      });
    if (expectedStatusClasses.length === 0) {
      throw new Error(`Missing mf:expectedStatus in a ht:Response of ${uri}`);
    }

    return {
      absolutePath: request.property.httpAbsolutePath.value,
      method: request.property.httpMethodName.value,
      headers,
      ...request.property.httpBody && {
        body: {
          chars: request.property.httpBody.property.contentChars.value,
          characterEncoding: request.property.httpBody.property.contentCharacterEncoding.value,
        },
      },
      expectedStatusClasses,
      ...response.property.expectedFormat && { expectedFormat: response.property.expectedFormat.value },
      ...response.property.expectedBoolean && {
        expectedBoolean: response.property.expectedBoolean.value === 'true',
      },
    };
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData, options?: IFetchOptions): Promise<TestCaseProtocol> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    const connection = resource.property.action;
    if (!connection.property.httpRequests) {
      throw new Error(`Missing ht:requests in mf:action of ${resource}`);
    }

    const requests = (connection.property.httpRequests.list ?? [])
      .map(request => TestCaseProtocolHandler.getRequest(request, resource.value));
    if (requests.length === 0) {
      throw new Error(`Missing ht:Request entries in ht:requests of ${resource}`);
    }

    const graphDataLinks: IQueryDataLink[] = TestCaseUpdateEvaluationHandler.getQueryDataLinks(resource);

    return new TestCaseProtocol(testCaseData, {
      requests,
      graphData: await TestCaseQueryEvaluationHandler.resolveQueryDataLinks(graphDataLinks, options),
      graphDataLinks,
    });
  }
}

export class TestCaseProtocol implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly requests: IProtocolRequest[];
  public readonly graphData: RDF.Quad[];
  public readonly graphDataLinks: IQueryDataLink[];

  public constructor(testCaseData: ITestCaseData, props: ITestCaseProtocolProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  /**
   * Determine the endpoint that the protocol requests must be sent to.
   * @param injectArguments The custom engine options.
   */
  public static getEndpoint(injectArguments: IProtocolTestOptions): string {
    const endpoint = injectArguments && injectArguments.protocolEndpoint;
    if (!endpoint) {
      throw new ErrorTest('Protocol tests require an endpoint from startProtocolEndpoint or the protocolEndpoint option.');
    }
    return endpoint;
  }

  /**
   * Replace the manifest path prefix of the given request path with the path of the endpoint under test.
   * @param endpoint The endpoint under test.
   * @param absolutePath A ht:absolutePath value.
   */
  public static resolveRequestUrl(endpoint: string, absolutePath: string): string {
    if (!absolutePath.startsWith(MANIFEST_PATH_PREFIX)) {
      throw new ErrorTest(`Expected the request path ${absolutePath} to start with ${MANIFEST_PATH_PREFIX}`);
    }
    return endpoint + absolutePath.slice(MANIFEST_PATH_PREFIX.length);
  }

  /**
   * Serialize the given quads into a SPARQL update that resets the endpoint to just those quads.
   * @param quads The quads to load, which must all be contained in a named graph.
   */
  public static createLoadUpdate(quads: RDF.Quad[]): string {
    const graphs: Record<string, string[]> = {};
    for (const quad of quads) {
      const graph = termToString(quad.graph);
      const triple = `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)} .`;
      (graphs[graph] ||= []).push(triple);
    }
    const groups = Object.entries(graphs)
      .map(([ graph, triples ]) => `GRAPH ${graph} { ${triples.join('\n')} }`);
    return `DROP SILENT ALL ;\nINSERT DATA { ${groups.join('\n')} }`;
  }

  /**
   * Determine the class of the given HTTP status code, e.g. 2 for 204.
   * @param status An HTTP status code.
   */
  public static statusClass(status: number): number {
    return Math.floor(status / 100);
  }

  public async test(_engine: IQueryEngine, injectArguments: IProtocolTestOptions): Promise<void> {
    const endpoint = TestCaseProtocol.getEndpoint(injectArguments);

    if (this.graphData.length > 0) {
      await this.loadGraphData(endpoint);
    }

    for (const request of this.requests) {
      await this.testRequest(endpoint, request);
    }
  }

  /**
   * Load the ut:graphData of this test case into the endpoint via a SPARQL update.
   * @param endpoint The endpoint under test.
   */
  protected async loadGraphData(endpoint: string): Promise<void> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/sparql-update' },
      body: TestCaseProtocol.createLoadUpdate(this.graphData),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new ErrorTest(`Could not load the test data into ${endpoint} (HTTP ${response.status}): ${body}`);
    }
  }

  /**
   * Send a single request of this test case to the endpoint, and validate its response.
   * @param endpoint The endpoint under test.
   * @param request The request to send.
   */
  protected async testRequest(endpoint: string, request: IProtocolRequest): Promise<void> {
    const url = TestCaseProtocol.resolveRequestUrl(endpoint, request.absolutePath);
    let response: Response;
    try {
      response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        redirect: 'manual',
        ...request.body && { body: TestCaseProtocol.encodeBody(request.body) },
      });
    } catch (error: unknown) {
      throw new ErrorTest(`Could not send a ${request.method} request to ${url}: ${(<Error> error).message}`);
    }
    const body = await response.text();

    if (!request.expectedStatusClasses.includes(TestCaseProtocol.statusClass(response.status))) {
      throw new ErrorTest(`Invalid response status for ${request.method} ${url}

  Expected one of: ${request.expectedStatusClasses.map(statusClass => `${statusClass}xx`).join(', ')}

  Got: ${response.status}\n\n${body}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (request.expectedFormat) {
      TestCaseProtocol.validateFormat(request, url, contentType);
    }
    if (request.expectedBoolean !== undefined) {
      await TestCaseProtocol.validateBoolean(request, url, contentType, body);
    }
  }

  /**
   * Encode the body of a request in the character encoding that the manifest declares for it.
   * @param body A ht:body value.
   * @param body.chars The characters of the body.
   * @param body.characterEncoding The character encoding to encode the body in.
   */
  public static encodeBody(body: { chars: string; characterEncoding: string }): ArrayBuffer {
    const encoding = body.characterEncoding.toUpperCase();
    if (encoding === 'UTF-8') {
      return new TextEncoder().encode(body.chars).buffer;
    }
    if (encoding === 'UTF-16') {
      return new Uint8Array(Buffer.from(`\uFEFF${body.chars}`, 'utf16le')).buffer;
    }
    throw new ErrorTest(`Unsupported cnt:characterEncoding ${body.characterEncoding}`);
  }

  /**
   * Validate that the content type of a response matches the format that the manifest expects.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param contentType The content type of the response.
   */
  public static validateFormat(request: IProtocolRequest, url: string, contentType: string): void {
    const contentTypes = EXPECTED_FORMAT_CONTENT_TYPES[request.expectedFormat];
    if (!contentTypes) {
      throw new ErrorTest(`Unsupported mf:expectedFormat ${request.expectedFormat}`);
    }
    if (!contentTypes.some(expected => contentType.includes(expected))) {
      throw new ErrorTest(`Invalid response content type for ${request.method} ${url}

  Expected a ${request.expectedFormat} format, which is one of: ${contentTypes.join(', ')}

  Got: ${contentType}`);
    }
  }

  /**
   * Validate that the body of a response contains the boolean result that the manifest expects.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param contentType The content type of the response.
   * @param body The body of the response.
   */
  public static async validateBoolean(
    request: IProtocolRequest,
    url: string,
    contentType: string,
    body: string,
  ): Promise<void> {
    let result: IQueryResultBoolean;
    try {
      const parsed = await TestCaseQueryEvaluationHandler
        .parseQueryResult(contentType, url, streamifyString(body));
      if (parsed.type !== 'boolean') {
        throw new Error(`Expected a boolean result, but got a result of type ${parsed.type}`);
      }
      result = parsed;
    } catch (error: unknown) {
      throw new ErrorTest(`Could not read a boolean result from the response of ${request.method} ${url}: ${(<Error> error).message}\n\n${body}`);
    }
    if (result.value !== request.expectedBoolean) {
      throw new ErrorTest(`Invalid boolean response for ${request.method} ${url}

  Expected: ${request.expectedBoolean}

  Got: ${result.value}`);
    }
  }
}
