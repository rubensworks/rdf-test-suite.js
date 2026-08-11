import type * as RDF from '@rdfjs/types';
import { arrayifyStream } from 'arrayify-stream';
import type { Resource } from 'rdf-object';
import { ErrorTest } from '../../ErrorTest';
import { Util } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SD = 'http://www.w3.org/ns/sparql-service-description#';

export interface IServiceDescriptionTestOptions {
  /** The SPARQL endpoint whose service description is under test. */
  serviceDescriptionEndpoint?: string;
}

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ServiceDescriptionTest.
 */
export class TestCaseServiceDescriptionHandler implements ITestCaseHandler<TestCaseServiceDescription> {
  public async resourceToTestCase(_resource: Resource, testCaseData: ITestCaseData): Promise<TestCaseServiceDescription> {
    return new TestCaseServiceDescription(testCaseData);
  }
}

export class TestCaseServiceDescription implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public constructor(testCaseData: ITestCaseData) {
    Object.assign(this, testCaseData);
  }

  public async test(_engine: IQueryEngine, injectArguments: IServiceDescriptionTestOptions): Promise<void> {
    const endpoint = TestCaseServiceDescription.getEndpoint(injectArguments);

    switch (this.name) {
      case 'GET on endpoint returns RDF':
        await TestCaseServiceDescription.getServiceDescription(endpoint);
        return;
      case 'Service description contains a matching sd:endpoint triple': {
        const serviceDescription = await TestCaseServiceDescription.getServiceDescription(endpoint);
        if (!serviceDescription.some(quad => quad.predicate.value === `${SD}endpoint` &&
          quad.object.termType === 'NamedNode' && quad.object.value === endpoint)) {
          throw new ErrorTest(`Service description at ${endpoint} does not contain a matching sd:endpoint triple.`);
        }
        return;
      }
      case 'Service description conforms to schema': {
        const serviceDescription = await TestCaseServiceDescription.getServiceDescription(endpoint);
        TestCaseServiceDescription.validateSchema(serviceDescription, endpoint);
        return;
      }
      default:
        throw new ErrorTest(`Unsupported SPARQL service-description test: ${this.name}`);
    }
  }

  private static getEndpoint(injectArguments: IServiceDescriptionTestOptions): string {
    const endpoint = injectArguments && injectArguments.serviceDescriptionEndpoint;
    if (!endpoint) {
      throw new ErrorTest('Service-description tests require an endpoint from startServiceDescriptionEndpoint or the serviceDescriptionEndpoint option.');
    }
    try {
      const url = new URL(endpoint);
      if (url.search || url.hash) {
        throw new Error('The endpoint URL must not contain query parameters or a fragment');
      }
    } catch (error) {
      throw new ErrorTest(`Invalid serviceDescriptionEndpoint: ${(error as Error).message}`);
    }
    return endpoint;
  }

  private static async getServiceDescription(endpoint: string): Promise<RDF.Quad[]> {
    try {
      const response = await Util.fetchCached(endpoint, {}, {
        headers: {
          accept: 'text/turtle, application/rdf+xml;q=0.9, application/ld+json;q=0.8',
        },
        method: 'GET',
      });
      const contentType = Util.identifyContentType(response.url, response.headers);
      return await arrayifyStream(Util.parseRdfRaw(contentType, endpoint, response.body));
    } catch (error) {
      throw new ErrorTest(`Could not retrieve an RDF service description from ${endpoint}: ${(error as Error).message}`);
    }
  }

  private static validateSchema(serviceDescription: RDF.Quad[], endpoint: string): void {
    const namedGraphs = new Set<string>();
    const namedGraphsWithName = new Set<string>();
    const datasets = new Set<string>();
    const datasetsWithDefaultGraph = new Set<string>();

    for (const quad of serviceDescription) {
      const subject = TestCaseServiceDescription.termKey(quad.subject);
      if (quad.predicate.value === `${SD}endpoint` && quad.object.termType !== 'NamedNode') {
        throw new ErrorTest(`The sd:endpoint value in the service description at ${endpoint} must be an IRI.`);
      }
      if (quad.predicate.value === `${SD}name`) {
        if (quad.object.termType !== 'NamedNode') {
          throw new ErrorTest(`The sd:name value in the service description at ${endpoint} must be an IRI.`);
        }
        namedGraphsWithName.add(subject);
      }
      if (quad.predicate.value === `${SD}namedGraph`) {
        namedGraphs.add(TestCaseServiceDescription.termKey(quad.object));
      }
      if (quad.predicate.value === `${SD}defaultGraph`) {
        datasetsWithDefaultGraph.add(subject);
      }
      if (quad.predicate.value === RDF_TYPE && quad.object.value === `${SD}NamedGraph`) {
        namedGraphs.add(subject);
      }
      if (quad.predicate.value === RDF_TYPE && quad.object.value === `${SD}Dataset`) {
        datasets.add(subject);
      }
    }

    for (const namedGraph of namedGraphs) {
      if (!namedGraphsWithName.has(namedGraph)) {
        throw new ErrorTest(`Each sd:NamedGraph in the service description at ${endpoint} must have an sd:name.`);
      }
    }
    for (const dataset of datasets) {
      if (!datasetsWithDefaultGraph.has(dataset)) {
        throw new ErrorTest(`Each sd:Dataset in the service description at ${endpoint} must have an sd:defaultGraph.`);
      }
    }
  }

  private static termKey(term: RDF.Term): string {
    return `${term.termType}:${term.value}`;
  }
}
