import type * as RDF from '@rdfjs/types';
import { arrayifyStream } from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { stringToTerm } from 'rdf-string';
import { stringToTerm as stringToTtlTerm } from 'rdf-string-ttl';
import type { QuadTermName } from 'rdf-terms';
import { mapTerms } from 'rdf-terms';
import { SparqlJsonParser } from 'sparqljson-parse';
import { SparqlXmlParser } from 'sparqlxml-parse';
import { ErrorTest } from '../../ErrorTest';
import type { IFetchOptions, IFetchResponse } from '../../Util';
import { Util } from '../../Util';
import type { ITestCaseData } from '../ITestCase';
import type { ITestCaseHandler } from '../ITestCaseHandler';
import type { IQueryEngine, IQueryResult, IQueryResultBindings } from './IQueryEngine';
import type { ITestCaseSparql } from './ITestCaseSparql';
import { QueryResultBindings } from './QueryResultBindings';
import { QueryResultBoolean } from './QueryResultBoolean';
import { QueryResultQuads } from './QueryResultQuads';

// eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
const stringifyStream = require('stream-to-string');

const DF = new DataFactory();

/**
 * Test case handler for http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#QueryEvaluationTest.
 */
export class TestCaseQueryEvaluationHandler implements ITestCaseHandler<TestCaseQueryEvaluation> {
  /**
   * Parse SPARQL query results in any of the following content types:
   * * application/sparql-results+xml (bindings/ask)
   * * application/sparql-results+json (bindings/ask)
   * * Any RDF serialization (quads)
   *
   * If the results has as first triple '[] a <http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet>',
   * the it will be considered as a DAWG result set, and parsed as such. (bindings)
   *
   * @param {string} contentType The content type.
   * @param {string} url The base IRI.
   * @param {NodeJS.ReadableStream} data The data stream to parse.
   * @return {Promise<IQueryResult>} A promise resolving to a SPARQL query result.
   */
  public static async parseQueryResult(contentType: string, url: string, data: NodeJS.ReadableStream): Promise<IQueryResult> {
    let queryResult: IQueryResult;
    try {
      const rdfStream: RDF.Stream = Util.parseRdfRaw(contentType, url, data);
      queryResult = new QueryResultQuads(await arrayifyStream(rdfStream));
    } catch {
      // Fallthrough to the next cases
    }
    if (contentType.includes('application/sparql-results+xml') || url.endsWith('.srx')) {
      contentType = 'application/sparql-results+xml';
      queryResult = await TestCaseQueryEvaluationHandler.parseSparqlResults('xml', data);
    }
    if (contentType.includes('application/sparql-results+json')) {
      queryResult = await TestCaseQueryEvaluationHandler.parseSparqlResults('json', data);
    }
    if (contentType.includes('text/tab-separated-values') || url.endsWith('.tsv')) {
      queryResult = await TestCaseQueryEvaluationHandler.parseSparqlTsvResults(data);
    }

    if (!queryResult) {
      throw new Error(`Could not parse the query result with content type ${contentType} at ${url}`);
    }

    // Discover DAWG result sets
    if (queryResult.type === 'quads' && queryResult.value.length > 0 &&
      queryResult.value[0].predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      queryResult.value[0].object.value === 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet') {
      return await TestCaseQueryEvaluationHandler.parseDawgResultSet(queryResult.value);
    }

    return queryResult;
  }

  /**
   * Parses query results in either SPARQL/JSON or SPARQL/XML query results syntax.
   * @param {string} type json or xml
   * @param {NodeJS.ReadableStream} data The data stream to parse.
   * @return {Promise<IQueryResult>} A promise resolving to a SPARQL query result.
   */
  public static async parseSparqlResults(type: 'json' | 'xml', data: NodeJS.ReadableStream): Promise<IQueryResult> {
    let booleanPromise: Promise<boolean>;
    let bindingsStream: NodeJS.ReadableStream;
    if (type === 'json') {
      const parser = new SparqlJsonParser({ prefixVariableQuestionMark: true });
      booleanPromise = parser.parseJsonBooleanStream(data);
      bindingsStream = parser.parseJsonResultsStream(data);
    } else {
      const parser = new SparqlXmlParser({ prefixVariableQuestionMark: true });
      booleanPromise = parser.parseXmlBooleanStream(data);
      bindingsStream = parser.parseXmlResultsStream(data);
    }
    const bindingsPromise: Promise<[RDF.Variable[], Record<string, RDF.Term>[]]> = Promise.all([
      new Promise<RDF.Variable[]>((resolve) => {
        bindingsStream
          .on('variables', resolve)
          .on('end', _ => resolve([]));
      }),
      arrayifyStream(bindingsStream),
    ]);

    // Parse both in parallel, and silence the errors
    let bindingsError: Error = null;
    let booleanError: Error = null;
    const parsingResults = await Promise.all([
      booleanPromise.catch((e): any => {
        booleanError = e;
        return null;
      }),
      bindingsPromise.catch((e): any => {
        bindingsError = e;
        return null;
      }),
    ]);

    if (!booleanError) {
      return new QueryResultBoolean(parsingResults[0]);
    }
    if (!bindingsError) {
      return new QueryResultBindings(parsingResults[1][0].map((variable: RDF.Variable) => `?${variable.value}`), parsingResults[1][1], false);
    }
    throw new Error(`Found no valid ASK or SELECT query.\n${
           bindingsError.message}\n${booleanError.message}`);
  }

  /**
   * Parses query results in the DAWG vocabulary.
   * https://www.w3.org/2001/sw/DataAccess/tests/test-dawg.n3
   * @param {Quad[]} quads An array of quads.
   * @return {Promise<IQueryResultBindings>} A promise resolving to a bindings results object.
   */
  public static async parseDawgResultSet(quads: RDF.Quad[]): Promise<IQueryResultBindings> {
    // Construct resources for easier interpretation of the bindings
    const objectLoader = new RdfObjectLoader({
      context: {
        result: 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#',
        bindings: 'result:binding',
        index: 'result:index',
        resultVariables: 'result:resultVariable',
        solutions: 'result:solution',
        value: 'result:value',
        variable: 'result:variable',
      },
    });
    await objectLoader.importArray(quads);
    let resultSet: Resource = null;
    for (const resourceName in objectLoader.resources) {
      if (objectLoader.resources[resourceName]
        .isA(stringToTerm('http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet'))) {
        resultSet = objectLoader.resources[resourceName];
        break;
      }
    }

    if (!resultSet) {
      throw new Error(`No valid DAWG result set was found in ${quads}`);
    }

    // Get the variable names
    const variables: string[] = resultSet.properties.resultVariables
      .map((resource: Resource) => `?${resource.value}`);

    // Check if any binding has .index
    let checkOrder = false;
    const s = resultSet.properties.solutions;
    for (const solution of s) {
      if (solution.property.index) {
        checkOrder = true;
        break;
      }
    }

    // Ensure that the solutions are sorted by index
    const solutions = resultSet.properties.solutions;
    if (checkOrder) {
      solutions.sort((solution1: Resource, solution2: Resource) => Number.parseInt(solution1.property.index.value, 10) - Number.parseInt(solution2.property.index.value, 10));
    }

    // Collect the bindings as object
    const value: Record<string, RDF.Term>[] = solutions.map((solution: Resource) => solution.properties.bindings.reduce((bindings: any, binding: Resource) => {
      bindings[`?${binding.property.variable.value}`] = binding.property.value.term;
      return bindings;
    }, {}));

    return new QueryResultBindings(variables, value, checkOrder);
  }

  /**
   * Parses query results from a SPARQL TSV stream.
   * @param {NodeJS.ReadableStream} data The data stream to parse.
   * @return {Promise<IQueryResult>} A promise resolving to a SPARQL query result.
   */
  public static async parseSparqlTsvResults(data: NodeJS.ReadableStream): Promise<IQueryResult> {
    const text: string = await stringifyStream(data);
    const lines = text.replace(/\r?\n$/u, '').split(/\r?\n/u);

    if (lines.length === 1) {
      const singleLine = lines[0].trim().toLowerCase();
      if (singleLine === 'true') {
        return new QueryResultBoolean(true);
      }
      if (singleLine === 'false') {
        return new QueryResultBoolean(false);
      }
    }

    const variables: string[] = [];

    if (lines[0].trim() !== '') {
      const rawVariables = lines[0].split('\t');

      for (const raw of rawVariables) {
        const variable = raw.trim();

        if (variable === '') {
          throw new Error('Invalid TSV result: Empty column on the first row.');
        }

        if ((!variable.startsWith('?') && !variable.startsWith('$')) || variable.length < 2) {
          throw new Error(`Invalid TSV variable: ${variable}`);
        }

        if (variables.includes(variable)) {
          throw new Error(`Invalid TSV result: The variable ${variable} is declared twice.`);
        }

        variables.push(variable);
      }
    }

    const value: Record<string, RDF.Term>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = lines[i].split('\t');

      const isZeroVariableResultRow = variables.length === 0 && fields.length === 1 && fields[0] === '';

      if (fields.length !== variables.length && !isZeroVariableResultRow) {
        throw new Error(`Invalid TSV row (Line ${i + 1}): expected ${variables.length} fields but found ${fields.length}.`);
      }

      const binding: Record<string, RDF.Term> = {};

      for (const [ j, variable ] of variables.entries()) {
        const field = fields[j].trim();

        if (field.length > 0) {
          try {
            binding[variable] = TestCaseQueryEvaluationHandler.parseTsvTerm(field);
          } catch (error: any) {
            throw new Error(
          `Failed to parse TSV value on Line ${i + 1}, Column '${variable}': ` +
          `Invalid Turtle syntax in "${field}".\nOriginal error: ${error.message}`,
            );
          }
        }
      }
      value.push(binding);
    }

    return new QueryResultBindings(variables, value, false);
  }

  /**
   * Parse a single field from a SPARQL TSV result into an RDF term.
   * @param {string} term The TSV field value.
   * @return {RDF.Term} The corresponding RDF term.
   */
  public static parseTsvTerm(term: string): RDF.Term {
    if (/^[+-]?[0-9]+$/u.test(term)) {
      return DF.literal(term, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
    }
    if (/^[+-]?([0-9]+\.[0-9]*|\.[0-9]+)$/u.test(term)) {
      return DF.literal(term, DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
    }
    if (/^[+-]?([0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/u.test(term)) {
      return DF.literal(term, DF.namedNode('http://www.w3.org/2001/XMLSchema#double'));
    }
    if (term === 'true' || term === 'false') {
      return DF.literal(term, DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));
    }

    return stringToTtlTerm(term);
  }

  /**
   * Obtain all data links for the given query test action.
   * @param action A query test action.
   */
  public static getQueryDataLinks(action: Resource): IQueryDataLink[] {
    const queryDataLinks: IQueryDataLink[] = [];
    if (action.property.data) {
      queryDataLinks.push({
        dataUri: action.property.data.value,
      });
    }
    for (const graphData of action.properties.graphData) {
      if (graphData.property.graph) {
        queryDataLinks.push({
          dataUri: graphData.property.graph.value,
          dataGraph: DF.namedNode(Util.normalizeBaseUrl(graphData.property.label.value)),
        });
      } else {
        queryDataLinks.push({
          dataUri: graphData.value,
          dataGraph: DF.namedNode(Util.normalizeBaseUrl(graphData.value)),
        });
      }
    }
    return queryDataLinks;
  }

  /**
   * Determine the quads for the given query data links.
   * @param queryDataLinks Links to query data.
   * @param options Fetch options.
   */
  public static async resolveQueryDataLinks(queryDataLinks: IQueryDataLink[], options?: IFetchOptions): Promise<RDF.Quad[]> {
    let queryData: RDF.Quad[] = [];
    for (const queryDataLink of queryDataLinks) {
      let queryDataThis: RDF.Quad[] = await arrayifyStream((await Util.fetchRdf(queryDataLink.dataUri, { ...options, normalizeUrl: true }))[1]);
      if (queryDataLink.dataGraph) {
        queryDataThis = queryDataThis.map(quad => mapTerms(quad, (value: RDF.Term, key: QuadTermName) => key === 'graph' ? queryDataLink.dataGraph : value));
      }
      queryData = [ ...queryData, ...queryDataThis ];
    }
    return queryData;
  }

  /**
   * Obtain all service data links for the given query test action.
   * @param action A query test action.
   */
  public static getServiceDataLinks(action: Resource): IServiceDataLink[] {
    const serviceDataLinks: IServiceDataLink[] = [];
    for (const serviceData of action.properties.serviceData) {
      serviceDataLinks.push({
        endpoint: serviceData.property.endpoint.value,
        dataUri: serviceData.property.data.value,
      });
    }
    return serviceDataLinks;
  }

  /**
   * Resolve service data links to a mapping of endpoint URIs to their quads.
   * @param serviceDataLinks Links to service data.
   * @param options Fetch options.
   */
  public static async resolveServiceDataLinks(serviceDataLinks: IServiceDataLink[], options?: IFetchOptions): Promise<Record<string, RDF.Quad[]>> {
    const serviceData: Record<string, RDF.Quad[]> = {};
    for (const link of serviceDataLinks) {
      serviceData[link.endpoint] = await arrayifyStream((await Util.fetchRdf(link.dataUri, { ...options, normalizeUrl: true }))[1]);
    }
    return serviceData;
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData, options?: IFetchOptions): Promise<TestCaseQueryEvaluation> {
    if (!resource.property.action) {
      throw new Error(`Missing mf:action in ${resource}`);
    }
    if (!resource.property.result) {
      throw new Error(`Missing mf:result in ${resource}`);
    }
    const action = resource.property.action;
    if (!action.property.query) {
      throw new Error(`Missing qt:query in mf:action of ${resource}`);
    }

    // Determine links to data
    const queryDataLinks: IQueryDataLink[] = TestCaseQueryEvaluationHandler.getQueryDataLinks(action);

    // Determine links to service data (for federated query tests)
    const serviceDataLinks: IServiceDataLink[] = TestCaseQueryEvaluationHandler.getServiceDataLinks(action);

    // Check for lax cardinality property
    let laxCardinality = false;
    if (resource.property.resultCardinality && resource.property.resultCardinality.value ===
      'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#LaxCardinality') {
      laxCardinality = true;
    }

    // Collect all query data
    const queryData: RDF.Quad[] = await TestCaseQueryEvaluationHandler.resolveQueryDataLinks(queryDataLinks, options);

    // Resolve service data for federated queries
    const serviceData: Record<string, RDF.Quad[]> = await TestCaseQueryEvaluationHandler.resolveServiceDataLinks(serviceDataLinks, options);

    const queryResponse = await Util.fetchCached(resource.property.result.value, options);
    return new TestCaseQueryEvaluation(
      testCaseData,
      {
        baseIRI: Util.normalizeBaseUrl(action.property.query.value),
        queryDataLinks,
        serviceDataLinks,
        laxCardinality,
        queryData,
        serviceData,
        queryResult: await TestCaseQueryEvaluationHandler.parseQueryResult(
          Util.identifyContentType(queryResponse.url, queryResponse.headers),
          queryResponse.url,
          queryResponse.body,
        ),
        queryString: await stringifyStream((await Util.fetchCached(action.property.query.value, options)).body),
        resultSource: queryResponse,
      },
    );
  }
}

export interface ITestCaseQueryEvaluationProps {
  baseIRI: string;
  queryString: string;
  queryData: RDF.Quad[];
  serviceData: Record<string, RDF.Quad[]>;
  queryResult: IQueryResult;
  laxCardinality: boolean;
  resultSource: IFetchResponse;
  queryDataLinks: IQueryDataLink[];
  serviceDataLinks: IServiceDataLink[];
}

export interface IQueryDataLink {
  dataUri: string;
  dataGraph?: RDF.NamedNode;
}

export interface IServiceDataLink {
  endpoint: string;
  dataUri: string;
}

export class TestCaseQueryEvaluation implements ITestCaseSparql {
  public readonly type = 'sparql';
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly baseIRI: string;
  public readonly queryString: string;
  public readonly queryData: RDF.Quad[];
  public readonly serviceData: Record<string, RDF.Quad[]>;
  public readonly queryResult: IQueryResult;
  public readonly laxCardinality: boolean;
  public readonly queryDataLinks: IQueryDataLink[];
  public readonly serviceDataLinks: IServiceDataLink[];
  public readonly resultSource: IFetchResponse;

  constructor(testCaseData: ITestCaseData, props: ITestCaseQueryEvaluationProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  public static queryDataLinksToString(queryDataLinks: IQueryDataLink[]): string {
    return queryDataLinks.map(queryDataLink => queryDataLink.dataUri + (queryDataLink.dataGraph ? ` (named graph: ${queryDataLink.dataGraph.value})` : '')).join(',\n    ');
  }

  public static serviceDataLinksToString(serviceDataLinks: IServiceDataLink[]): string {
    if (serviceDataLinks.length === 0) {
      return 'None';
    }
    return serviceDataLinks.map(link => `${link.endpoint} (data: ${link.dataUri})`).join(',\n    ');
  }

  public async test(engine: IQueryEngine, injectArguments: any): Promise<void> {
    const options: Record<string, any> = { baseIRI: this.baseIRI, ...injectArguments };
    if (Object.keys(this.serviceData).length > 0) {
      options.serviceData = this.serviceData;
    }
    const result: IQueryResult = await engine.query(this.queryData, this.queryString, options);
    if (!this.queryResult.equals(result, this.laxCardinality)) {
      throw new ErrorTest(`Invalid query evaluation

  Query:\n\n${this.queryString}

  Data links: ${TestCaseQueryEvaluation.queryDataLinksToString(this.queryDataLinks)}

  Service links: ${TestCaseQueryEvaluation.serviceDataLinksToString(this.serviceDataLinks)}

  Result Source: ${this.resultSource.url}

  Expected: ${this.queryResult.toString()}

  Got: \n ${result.toString()}
`);
    }
  }
}
