import {namedNode} from "@rdfjs/data-model";
import * as RDF from "rdf-js";
import {RdfObjectLoader, Resource} from "rdf-object";
import {stringToTerm} from "rdf-string";
import {mapTerms, QuadTermName} from "rdf-terms";
import {SparqlJsonParser} from "sparqljson-parse";
import {SparqlXmlParser} from "sparqlxml-parse";
import {IFetchOptions, IFetchResponse, Util} from "../../Util";
import {ITestCaseData} from "../ITestCase";
import {ITestCaseHandler} from "../ITestCaseHandler";
import {IQueryEngine, IQueryResult, IQueryResultBindings} from "./IQueryEngine";
import {ITestCaseSparql} from "./ITestCaseSparql";
import {QueryResultBindings} from "./QueryResultBindings";
import {QueryResultBoolean} from "./QueryResultBoolean";
import {QueryResultQuads} from "./QueryResultQuads";
// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const stringifyStream = require('stream-to-string');

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
  public static async parseQueryResult(contentType: string, url: string,
                                       data: NodeJS.ReadableStream): Promise<IQueryResult> {
    let queryResult: IQueryResult;
    try {
      const rdfStream: RDF.Stream = Util.parseRdfRaw(contentType, url, data);
      queryResult = new QueryResultQuads(await arrayifyStream(rdfStream));
    } catch (e) {
      // Fallthrough to the next cases
    }
    if (contentType.indexOf('application/sparql-results+xml') >= 0) {
      queryResult = await TestCaseQueryEvaluationHandler.parseSparqlResults('xml', data);
    }
    if (contentType.indexOf('application/sparql-results+json') >= 0) {
      queryResult = await TestCaseQueryEvaluationHandler.parseSparqlResults('json', data);
    }

    if (!queryResult) {
      throw new Error(`Could not parse the query result with content type ${contentType} at ${url}`);
    }

    // Discover DAWG result sets
    if (queryResult.type === 'quads' && queryResult.value.length > 0
      && queryResult.value[0].predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      && queryResult.value[0].object.value === 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet') {
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
    let parser;
    let booleanPromise: Promise<boolean>;
    let bindingsStream: NodeJS.ReadableStream;
    if (type === 'json') {
      parser = new SparqlJsonParser({ prefixVariableQuestionMark: true });
      booleanPromise = parser.parseJsonBooleanStream(data);
      bindingsStream = parser.parseJsonResultsStream(data);
    } else {
      parser = new SparqlXmlParser({ prefixVariableQuestionMark: true });
      booleanPromise = parser.parseXmlBooleanStream(data);
      bindingsStream = parser.parseXmlResultsStream(data);
    }
    const bindingsPromise: Promise<[RDF.Variable[], { [variable: string]: RDF.Term }[]]> = Promise.all([
      new Promise<RDF.Variable[]>((resolve) => bindingsStream.on('variables', resolve)),
      arrayifyStream(bindingsStream),
    ]);

    // Parse both in parallel, and silence the errors
    let bindingsError: Error = null;
    let booleanError: Error = null;
    const parsingResults = await Promise.all([
      booleanPromise.catch((e) => {
        booleanError = e;
        return null;
      }),
      bindingsPromise.catch((e) => {
        bindingsError = e;
        return null;
      }),
    ]);

    if (!booleanError) {
      return new QueryResultBoolean(parsingResults[0]);
    } else if (!bindingsError) {
      return new QueryResultBindings(parsingResults[1][0].map((variable: RDF.Variable) => '?' + variable.value),
        parsingResults[1][1], false);
    } else {
      throw new Error('Found no valid ASK or SELECT query.\n'
        + bindingsError.message + '\n' + booleanError.message);
    }
  }

  /**
   * Parses query results in the DAWG vocabulary.
   * https://www.w3.org/2001/sw/DataAccess/tests/test-dawg.n3
   * @param {Quad[]} quads An array of quads.
   * @return {Promise<IQueryResultBindings>} A promise resolving to a bindings results object.
   */
  public static async parseDawgResultSet(quads: RDF.Quad[]): Promise<IQueryResultBindings> {
    // Construct resources for easier interpretation of the bindings
    // tslint:disable:object-literal-sort-keys
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
    // tslint:enable:object-literal-sort-keys
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
      throw new Error('No valid DAWG result set was found in ' + quads);
    }

    // Get the variable names
    const variables: string[] = resultSet.properties.resultVariables
      .map((resource: Resource) => '?' + resource.value);

    // check if any binding has .index
    let checkOrder: boolean = false;
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
      solutions.sort((solution1: Resource, solution2: Resource) => {
        return parseInt(solution1.property.index.value, 10) - parseInt(solution2.property.index.value, 10);
      });
    }

    // Collect the bindings as object
    const value: {[variable: string]: RDF.Term}[] = solutions.map((solution: Resource) => {
      return solution.properties.bindings.reduce((bindings: any, binding: Resource) => {
        bindings['?' + binding.property.variable.value] = binding.property.value.term;
        return bindings;
      }, {});
    });

    return new QueryResultBindings(variables, value, checkOrder);
  }

  public async resourceToTestCase(resource: Resource, testCaseData: ITestCaseData,
                                  options?: IFetchOptions): Promise<TestCaseQueryEvaluation> {
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

    let dataUri: string = null;
    let dataGraph: RDF.NamedNode = null;
    let laxCardinality: boolean = false;
    if (action.property.data) {
      dataUri = action.property.data.value;
    }
    if (action.property.graphData) {
      const graphData: Resource = action.property.graphData;
      if (graphData.property.graph) {
        dataUri = graphData.property.graph.value;
        dataGraph = namedNode(graphData.property.label.value);
      } else {
        dataUri = action.property.graphData.value;
      }
    }

    if (resource.property.resultCardinality && resource.property.resultCardinality.value
      === 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#LaxCardinality') {
      laxCardinality = true;
    }

    let queryData: RDF.Quad[] = dataUri ? await arrayifyStream((await Util.fetchRdf(dataUri, options))[1]) : [];
    if (dataGraph) {
      queryData = queryData.map((quad) => mapTerms(quad,
        (value: RDF.Term, key: QuadTermName) => key === 'graph' ? dataGraph : value));
    }
    const queryResponse = await Util.fetchCached(resource.property.result.value, options);
    return new TestCaseQueryEvaluation(
      testCaseData,
      {
        baseIRI: Util.normalizeBaseUrl(action.property.query.value),
        dataGraph,
        dataUri,
        laxCardinality,
        queryData,
        queryResult: await TestCaseQueryEvaluationHandler.parseQueryResult(
          Util.identifyContentType(queryResponse.url, queryResponse.headers),
          queryResponse.url, queryResponse.body),
        queryString: await stringifyStream((await Util.fetchCached(action.property.query.value, options)).body),
        resultSource: queryResponse,
      });
  }

}

export interface ITestCaseQueryEvaluationProps {
  baseIRI: string;
  queryString: string;
  queryData: RDF.Quad[];
  queryResult: IQueryResult;
  laxCardinality: boolean;
  resultSource: IFetchResponse;
  dataGraph?: RDF.NamedNode;
  dataUri?: string;
}

export class TestCaseQueryEvaluation implements ITestCaseSparql {
  public readonly type = "sparql";
  public readonly approval: string;
  public readonly approvedBy: string;
  public readonly comment: string;
  public readonly types: string[];
  public readonly name: string;
  public readonly uri: string;

  public readonly baseIRI: string;
  public readonly queryString: string;
  public readonly queryData: RDF.Quad[];
  public readonly queryResult: IQueryResult;
  public readonly laxCardinality: boolean;
  public readonly dataUri?: string;
  public readonly dataGraph?: RDF.NamedNode;
  public readonly resultSource: IFetchResponse;

  constructor(testCaseData: ITestCaseData, props: ITestCaseQueryEvaluationProps) {
    Object.assign(this, testCaseData);
    Object.assign(this, props);
  }

  public async test(engine: IQueryEngine, injectArguments: any): Promise<void> {
    const result: IQueryResult = await engine.query(this.queryData, this.queryString,
      { baseIRI: this.baseIRI, ...injectArguments });
    const dataGraphInfo = this.dataGraph ? ` (named graph: ${this.dataGraph})` : '';
    if (!await this.queryResult.equals(result, this.laxCardinality)) {
      throw new Error(`Invalid query evaluation

  Query:\n\n${this.queryString}

  Data: ${this.dataUri || 'none'}${dataGraphInfo}

  Result Source: ${this.resultSource.url}

  Expected: ${this.queryResult.toString()}

  Got: \n ${result.toString()}
`);
    }
  }

}
