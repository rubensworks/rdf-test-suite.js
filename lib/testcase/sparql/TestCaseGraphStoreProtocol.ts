import type * as RDF from '@rdfjs/types';
import { arrayifyStream } from 'arrayify-stream';
import { isomorphic } from 'rdf-isomorphic';
import type { Resource } from 'rdf-object';
import { ErrorSkipped } from '../../ErrorSkipped';
import { ErrorTest } from '../../ErrorTest';
import { Util } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';
import type { IHttpContent } from './TestCaseProtocol';
import { TestCaseProtocol } from './TestCaseProtocol';

// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
const streamifyString = require('streamify-string');

const MF = 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#';

/**
 * The path prefix that every ht:absolutePath in the SPARQL 1.1 Graph Store Protocol manifest starts with.
 * It is replaced by the path of the graph store endpoint under test.
 */
const MANIFEST_PATH_PREFIX = '/gsp';

const STATUS_CODE_CLASS_REGEX = /^http:\/\/www\.w3\.org\/2011\/http-statusCodes#StatusCode(\d)xx$/u;

const STATUS_CODE_PREFIX = 'http://www.w3.org/2011/http-statusCodes#';

/**
 * The status codes of the HTTP status codes vocabulary that the manifests refer to by name.
 */
const STATUS_CODES: Record<string, number> = {
  OK: 200,
  Created: 201,
  NoContent: 204,
  NotFound: 404,
};

/**
 * The features that an endpoint must support for a test to be applicable,
 * as expressed through mf:requires in the manifest.
 */
const KNOWN_FEATURES = new Set([
  `${MF}DirectGraphIdentification`,
  `${MF}IndirectGraphIdentification`,
  `${MF}POSTGraphCreation`,
]);

/**
 * A single HTTP request of a graph store protocol test, together with its expected response.
 */
export interface IGraphStoreRequest {
  absolutePath: string;
  method: string;
  headers: [string, string][];
  body?: IHttpContent;
  expectedStatuses: number[];
  expectedStatusClasses: number[];
  expectedLocation?: string;
  expectedHeaders: [string, string][];
  expectedBody?: IHttpContent;
}

export interface IGraphStoreProtocolTestOptions {
  /** The SPARQL Graph Store Protocol endpoint that the requests are sent to. */
  graphStoreEndpoint?: string;
}

export interface ITestCaseGraphStoreProtocolProps {
  requests: IGraphStoreRequest[];
  requiredFeatures: string[];
}

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#GraphStoreProtocolTest.
 */
export class TestCaseGraphStoreProtocolHandler implements ITestCaseHandler<TestCaseGraphStoreProtocol> {
  /**
   * Interpret the ht:headers of a ht:Request or ht:Response.
   * @param resource A ht:Request or ht:Response resource.
   */
  public static getHeaders(resource: Resource): [string, string][] {
    const headers: [string, string][] = [];
    for (const headerList of resource.properties.httpHeaders) {
      for (const header of headerList.list ?? []) {
        headers.push([ header.property.httpFieldName.value, header.property.httpFieldValue.value ]);
      }
    }
    return headers;
  }

  /**
   * Interpret a cnt:ContentAsText resource.
   * @param content A cnt:ContentAsText resource.
   */
  public static getContent(content: Resource): IHttpContent {
    return {
      chars: content.property.contentChars.value,
      characterEncoding: content.property.contentCharacterEncoding.value,
    };
  }

  /**
   * Interpret a mf:expectedStatus value as either a concrete status code or a status code class.
   * @param status A mf:expectedStatus value.
   * @param uri The URI of the test case the status belongs to, used for error reporting.
   */
  public static getExpectedStatus(status: string, uri: string): { status?: number; statusClass?: number } {
    const classMatch = STATUS_CODE_CLASS_REGEX.exec(status);
    if (classMatch) {
      return { statusClass: Number.parseInt(classMatch[1], 10) };
    }
    if (status.startsWith(STATUS_CODE_PREFIX)) {
      const code = STATUS_CODES[status.slice(STATUS_CODE_PREFIX.length)];
      if (code) {
        return { status: code };
      }
    }
    throw new Error(`Unsupported mf:expectedStatus ${status} in ${uri}`);
  }

  /**
   * Interpret a single ht:Request resource, together with the ht:Response it is expected to produce.
   * @param request A ht:Request resource.
   * @param uri The URI of the test case the request belongs to, used for error reporting.
   */
  public static getRequest(request: Resource, uri: string): IGraphStoreRequest {
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

    const expectedStatuses: number[] = [];
    const expectedStatusClasses: number[] = [];
    for (const expected of response.properties.expectedStatus) {
      const { status, statusClass } = TestCaseGraphStoreProtocolHandler.getExpectedStatus(expected.value, uri);
      if (status === undefined) {
        expectedStatusClasses.push(statusClass);
      } else {
        expectedStatuses.push(status);
      }
    }
    if (expectedStatuses.length === 0 && expectedStatusClasses.length === 0) {
      throw new Error(`Missing mf:expectedStatus in a ht:Response of ${uri}`);
    }

    return {
      absolutePath: request.property.httpAbsolutePath.value,
      method: request.property.httpMethodName.value,
      headers: TestCaseGraphStoreProtocolHandler.getHeaders(request),
      ...request.property.httpBody && {
        body: TestCaseGraphStoreProtocolHandler.getContent(request.property.httpBody),
      },
      expectedStatuses,
      expectedStatusClasses,
      ...response.property.expectedLocation && { expectedLocation: response.property.expectedLocation.value },
      expectedHeaders: TestCaseGraphStoreProtocolHandler.getHeaders(response),
      ...response.property.httpBody && {
        expectedBody: TestCaseGraphStoreProtocolHandler.getContent(response.property.httpBody),
      },
    };
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData): Promise<TestCaseGraphStoreProtocol> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    const connection = resource.property.action;
    if (!connection.property.httpRequests) {
      throw new Error(`Missing ht:requests in mf:action of ${resource}`);
    }

    const requests = (connection.property.httpRequests.list ?? [])
      .map(request => TestCaseGraphStoreProtocolHandler.getRequest(request, resource.value));
    if (requests.length === 0) {
      throw new Error(`Missing ht:Request entries in ht:requests of ${resource}`);
    }

    return new TestCaseGraphStoreProtocol(testCaseData, {
      requests,
      requiredFeatures: resource.properties.requires.map(feature => feature.value),
    });
  }
}

export class TestCaseGraphStoreProtocol implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly requests: IGraphStoreRequest[];
  public readonly requiredFeatures: string[];

  public constructor(testCaseData: ITestCaseData, props: ITestCaseGraphStoreProtocolProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  /**
   * Determine the endpoint that the graph store protocol requests must be sent to.
   * @param injectArguments The custom engine options.
   */
  public static getEndpoint(injectArguments: IGraphStoreProtocolTestOptions): string {
    const endpoint = injectArguments && injectArguments.graphStoreEndpoint;
    if (!endpoint) {
      throw new ErrorTest('Graph store protocol tests require an endpoint from startGraphStoreEndpoint or the graphStoreEndpoint option.');
    }
    return endpoint;
  }

  /**
   * Replace the manifest path prefix of the given request path with the path of the endpoint under test.
   * @param endpoint The endpoint under test.
   * @param absolutePath A ht:absolutePath value.
   */
  public static resolveRequestUrl(endpoint: string, absolutePath: string): string {
    const suffix = absolutePath.slice(MANIFEST_PATH_PREFIX.length);
    if (!absolutePath.startsWith(MANIFEST_PATH_PREFIX) || (suffix && !suffix.startsWith('/') && !suffix.startsWith('?'))) {
      throw new ErrorTest(`Expected the request path ${absolutePath} to start with ${MANIFEST_PATH_PREFIX}`);
    }
    return endpoint + suffix;
  }

  /**
   * Determine the class of the given HTTP status code, e.g. 2 for 204.
   * @param status An HTTP status code.
   */
  public static statusClass(status: number): number {
    return Math.floor(status / 100);
  }

  /**
   * Determine the media type of a content type header value, without any of its parameters.
   * @param contentType A content type header value.
   */
  public static mediaType(contentType: string): string {
    return contentType.split(';')[0].trim().toLowerCase();
  }

  /**
   * Replace all template variables in the given string with the values they have been bound to.
   * @param value The string to fill the template variables in.
   * @param templates The values of the template variables, indexed by variable.
   */
  public static fillTemplates(value: string, templates: Record<string, string>): string {
    return Object.entries(templates)
      .reduce((filled, [ variable, binding ]) => filled.split(variable).join(binding), value);
  }

  public async test(_engine: IQueryEngine, injectArguments: IGraphStoreProtocolTestOptions): Promise<void> {
    const unsupported = this.requiredFeatures.filter(feature => !KNOWN_FEATURES.has(feature));
    if (unsupported.length > 0) {
      throw new ErrorSkipped(`Unsupported graph store protocol features: ${unsupported.join(', ')}`);
    }

    const endpoint = TestCaseGraphStoreProtocol.getEndpoint(injectArguments);
    await this.clearGraphs(endpoint);

    const templates: Record<string, string> = {};
    for (const request of this.requests) {
      await this.testRequest(endpoint, request, templates);
    }
  }

  /**
   * Delete every graph that this test case addresses, so that it starts from a known state.
   * The responses are ignored, as the graphs are not required to exist.
   * @param endpoint The endpoint under test.
   */
  protected async clearGraphs(endpoint: string): Promise<void> {
    const variables = this.requests
      .map(request => request.expectedLocation)
      .filter((variable): variable is string => variable !== undefined);
    const paths = new Set(this.requests
      .map(request => request.absolutePath)
      .filter(absolutePath => absolutePath !== MANIFEST_PATH_PREFIX)
      .filter(absolutePath => !variables.some(variable => absolutePath.includes(variable))));

    for (const absolutePath of paths) {
      const url = TestCaseGraphStoreProtocol.resolveRequestUrl(endpoint, absolutePath);
      try {
        await fetch(url, { method: 'DELETE' });
      } catch {
        // The graphs are cleared on a best-effort basis, failures are reported by the test requests themselves
      }
    }
  }

  /**
   * Send a single request of this test case to the endpoint, and validate its response.
   * @param endpoint The endpoint under test.
   * @param request The request to send.
   * @param templates The template variables bound by the previous requests, extended by this request.
   */
  protected async testRequest(
    endpoint: string,
    request: IGraphStoreRequest,
    templates: Record<string, string>,
  ): Promise<void> {
    const url = TestCaseGraphStoreProtocol
      .resolveRequestUrl(endpoint, TestCaseGraphStoreProtocol.fillTemplates(request.absolutePath, templates));
    let response: Response;
    try {
      response = await fetch(url, {
        method: request.method,
        headers: request.headers,
        redirect: 'manual',
        ...request.body && {
          body: TestCaseProtocol.encodeBody({
            ...request.body,
            chars: TestCaseGraphStoreProtocol.fillTemplates(request.body.chars, templates),
          }),
        },
      });
    } catch (error: unknown) {
      throw new ErrorTest(`Could not send a ${request.method} request to ${url}: ${(<Error> error).message}`);
    }
    const body = await response.text();

    this.validateStatus(request, url, response.status, body);
    if (request.expectedLocation) {
      templates[request.expectedLocation] = TestCaseGraphStoreProtocol
        .getLocation(request, url, response);
    }
    TestCaseGraphStoreProtocol.validateHeaders(request, url, response);
    if (request.expectedBody) {
      await TestCaseGraphStoreProtocol.validateBody(request, url, response, body);
    }
  }

  /**
   * Validate that the status of a response is one of the statuses that the manifest expects.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param status The status of the response.
   * @param body The body of the response.
   */
  protected validateStatus(request: IGraphStoreRequest, url: string, status: number, body: string): void {
    if (request.expectedStatuses.includes(status) ||
      request.expectedStatusClasses.includes(TestCaseGraphStoreProtocol.statusClass(status))) {
      return;
    }
    const expected = [
      ...request.expectedStatuses.map(String),
      ...request.expectedStatusClasses.map(statusClass => `${statusClass}xx`),
    ];
    throw new ErrorTest(`Invalid response status for ${request.method} ${url}

  Expected one of: ${expected.join(', ')}

  Got: ${status}\n\n${body}`);
  }

  /**
   * Determine the location that a response points to, which subsequent requests in this test case refer to.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param response The response that was received.
   */
  public static getLocation(request: IGraphStoreRequest, url: string, response: Response): string {
    const location = response.headers.get('location');
    if (!location) {
      throw new ErrorTest(`Missing Location response header for ${request.method} ${url}`);
    }
    return new URL(location, url).href;
  }

  /**
   * Validate that the headers of a response match the headers that the manifest expects.
   * Content type parameters such as the character encoding are not compared.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param response The response that was received.
   */
  public static validateHeaders(request: IGraphStoreRequest, url: string, response: Response): void {
    for (const [ name, value ] of request.expectedHeaders) {
      const actual = response.headers.get(name);
      const equal = name.toLowerCase() === 'content-type' && actual ?
        TestCaseGraphStoreProtocol.mediaType(actual) === TestCaseGraphStoreProtocol.mediaType(value) :
        actual === value;
      if (!equal) {
        throw new ErrorTest(`Invalid ${name} response header for ${request.method} ${url}

  Expected: ${value}

  Got: ${actual}`);
      }
    }
  }

  /**
   * Validate that the body of a response is isomorphic to the graph that the manifest expects.
   * @param request The request that was sent.
   * @param url The URL the request was sent to.
   * @param response The response that was received.
   * @param body The body of the response.
   */
  public static async validateBody(
    request: IGraphStoreRequest,
    url: string,
    response: Response,
    body: string,
  ): Promise<void> {
    const expectedContentType = request.expectedHeaders
      .find(([ name ]) => name.toLowerCase() === 'content-type')?.[1] ?? '';
    const expected = await TestCaseGraphStoreProtocol
      .parseBody(expectedContentType, url, request.expectedBody.chars, 'expected');
    const actual = await TestCaseGraphStoreProtocol
      .parseBody(response.headers.get('content-type') ?? '', url, body, 'actual');

    if (!isomorphic(expected, actual)) {
      throw new ErrorTest(`Invalid response body for ${request.method} ${url}

  Expected: ${request.expectedBody.chars}

  Got: ${body}`);
    }
  }

  /**
   * Parse an RDF graph that was sent over HTTP.
   * @param contentType The content type the graph is serialized in.
   * @param url The URL that the graph is a representation of, which relative IRIs are resolved against.
   * @param body The serialized graph.
   * @param label The kind of body that is being parsed, used for error reporting.
   */
  public static async parseBody(
    contentType: string,
    url: string,
    body: string,
    label: string,
  ): Promise<RDF.Quad[]> {
    try {
      return await arrayifyStream(Util.parseRdfRaw(contentType, url, streamifyString(body)));
    } catch (error: unknown) {
      throw new ErrorTest(`Could not parse the ${label} response body of ${url}: ${(<Error> error).message}\n\n${body}`);
    }
  }
}
