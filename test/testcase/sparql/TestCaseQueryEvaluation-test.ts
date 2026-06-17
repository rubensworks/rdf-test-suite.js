import type * as RDF from '@rdfjs/types';
import { ContextParser } from 'jsonld-context-parser';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import { Resource } from 'rdf-object';
import { QueryResultQuads } from '../../../lib/testcase/sparql/QueryResultQuads';
import { TestCaseQueryEvaluation, TestCaseQueryEvaluationHandler } from '../../../lib/testcase/sparql/TestCaseQueryEvaluation';

const quad = require('rdf-quad');

const streamifyString = require('streamify-string');

const DF = new DataFactory();

// Mock fetch
(<any> globalThis).fetch = (url: string) => {
  let body;
  let headers = new Headers({ a: 'b' });
  switch (url) {
    case 'ACTION.ok':
      body = streamifyString(`OK`);
      break;
    case 'ACTION.invalid':
      body = streamifyString(`INVALID`);
      break;
    case 'RESULT.ttl':
      body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
      headers = new Headers({ 'Content-Type': 'text/turtle' });
      break;
    case 'RESULT1.ttl':
      body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title> "A".`);
      headers = new Headers({ 'Content-Type': 'text/turtle' });
      break;
    case 'RESULT2.ttl':
      body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title> "B".`);
      headers = new Headers({ 'Content-Type': 'text/turtle' });
      break;
    case 'RESULT3.ttl':
      body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title> "C".`);
      headers = new Headers({ 'Content-Type': 'text/turtle' });
      break;
    case 'RESULT_OTHER.ttl':
      body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar_ABC> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
      headers = new Headers({ 'Content-Type': 'text/turtle' });
      break;
    default:
      return Promise.reject(new Error(`Fetch error for ${url}`));
  }
  return Promise.resolve(new Response(body, <any> { headers, status: 200 }));
};

describe('TestCaseQueryEvaluationHandler', () => {
  const handler = new TestCaseQueryEvaluationHandler();
  const engine = {
    parse: (queryString: string) => queryString === 'OK' ?
      Promise.resolve(null) :
      Promise.reject(new Error(`Invalid data ${queryString}`)),
    query: (_data: RDF.Quad[], _queryString: string) => Promise.resolve(new QueryResultQuads([
      quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
      quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
    ])),
  };

  let context;
  let pAction;
  let pResult;
  let pQuery;
  let pCardinality;
  let pData;
  let pGraphData;
  let pGraph;
  let pLabel;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context },
        );
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context },
        );
        pQuery = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-query#query'), context },
        );
        pCardinality = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#resultCardinality'), context },
        );
        pData = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-query#data'), context },
        );
        pGraphData = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-query#graphData'), context },
        );
        pGraph = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-query#graph'), context },
        );
        pLabel = new Resource(
          { term: DF.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), context },
        );

        done();
      });
  });

  describe('#parseQueryResult', () => {
    it('should reject on an unknown content type', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('unknown', 'a', streamifyString(`
`))).rejects.toBeTruthy();
    });

    it('should resolve on SPARQL/XML', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('application/sparql-results+xml', 'a', streamifyString(`<?xml version="1.0" encoding="UTF-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="book"/>
  </head>
  <results>
    <result>
      <binding name="book">
          <uri>http://example.org/book/book1</uri>
      </binding>
    </result>
    <result>
      <binding name="book">
          <uri>http://example.org/book/book2</uri>
      </binding>
    </result>
  </results>
</sparql>
`))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          value: [
            {
              '?book': DF.namedNode('http://example.org/book/book1'),
            },
            {
              '?book': DF.namedNode('http://example.org/book/book2'),
            },
          ],
          variables: [ '?book' ],
        });
    });

    it('should resolve on SPARQL/JSON', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('application/sparql-results+json', 'a', streamifyString(`
{
  "head": {
    "vars": [
      "book"
      ]
  },
  "results": {
    "bindings": [
      { "book": { "type": "uri", "value": "http://example.org/book/book1" } },
      { "book": { "type": "uri", "value": "http://example.org/book/book2" } }
    ]
  }
}
`))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          value: [
            {
              '?book': DF.namedNode('http://example.org/book/book1'),
            },
            {
              '?book': DF.namedNode('http://example.org/book/book2'),
            },
          ],
          variables: [ '?book' ],
        });
    });

    it('should resolve on turtle', async() => {
      return expect((await TestCaseQueryEvaluationHandler.parseQueryResult('text/turtle', 'a', streamifyString(`
<a> <b> <c>.
`))).value).toBeRdfIsomorphic([
        quad('aa', 'ab', 'ac'),
      ]);
    });

    it('should resolve on DAWG result sets', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('text/turtle', 'a', streamifyString(`
<a> a <http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet>.
`))).resolves
        .toMatchObject({
          checkOrder: false,
          type: 'bindings',
          value: [],
          variables: [],
        });
    });

    it('should resolve on TSV via content type', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('text/tab-separated-values', 'a', streamifyString(`?book\n<http://example.org/book/book1>\n<http://example.org/book/book2>`))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          value: [
            { '?book': DF.namedNode('http://example.org/book/book1') },
            { '?book': DF.namedNode('http://example.org/book/book2') },
          ],
          variables: [ '?book' ],
        });
    });

    it('should resolve on TSV via file extension fallback', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseQueryResult('unknown', 'http://example.org/results.tsv', streamifyString(`true`))).resolves
        .toEqual({
          type: 'boolean',
          value: true,
        });
    });
  });

  describe('#parseSparqlResults', () => {
    it('should should parse JSON booleans', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlResults('json', streamifyString(`
{
  "head" : { },
  "boolean" : true
}
`))).resolves
        .toEqual({
          type: 'boolean',
          value: true,
        });
    });

    it('should should parse JSON bindings', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlResults('json', streamifyString(`
{
  "head": {
    "vars": [
      "book"
      ]
  },
  "results": {
    "bindings": [
      { "book": { "type": "uri", "value": "http://example.org/book/book1" } },
      { "book": { "type": "uri", "value": "http://example.org/book/book2" } }
    ]
  }
}
`))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          value: [
            {
              '?book': DF.namedNode('http://example.org/book/book1'),
            },
            {
              '?book': DF.namedNode('http://example.org/book/book2'),
            },
          ],
          variables: [ '?book' ],
        });
    });

    it('should should parse XML booleans', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlResults('xml', streamifyString(`<?xml version="1.0"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <boolean>true</boolean>
</sparql>
`))).resolves
        .toEqual({
          type: 'boolean',
          value: true,
        });
    });

    it('should should parse XML bindings', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlResults('xml', streamifyString(`<?xml version="1.0"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="book"/>
  </head>
  <results>
    <result>
      <binding name="book">
          <uri>http://example.org/book/book1</uri>
      </binding>
    </result>
    <result>
      <binding name="book">
          <uri>http://example.org/book/book2</uri>
      </binding>
    </result>
  </results>
</sparql>
`))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          value: [
            {
              '?book': DF.namedNode('http://example.org/book/book1'),
            },
            {
              '?book': DF.namedNode('http://example.org/book/book2'),
            },
          ],
          variables: [ '?book' ],
        });
    });

    it('should should reject on invalid XML bindings or boolean', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlResults('xml', streamifyString(`
{
`))).rejects.toBeTruthy();
    });
  });

  describe('#parseDawgResultSet', () => {
    it('should reject on an empty array', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([])).rejects.toBeTruthy();
    });

    it('should reject on an array without result set', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([
        quad('a', 'b', 'c'),
      ])).rejects.toBeTruthy();
    });

    it('should resolve on an array with an empty result set', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([
        quad('_:b', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet'),
      ])).resolves.toEqual({
        checkOrder: false,
        type: 'bindings',
        value: [],
        variables: [],
      });
    });

    it('should resolve on an array with an empty result set with variables', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([
        quad('_:b', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v1'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v2'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v3'),
      ])).resolves.toEqual({
        checkOrder: false,
        type: 'bindings',
        value: [],
        variables: [ '?v1', '?v2', '?v3' ],
      });
    });

    it('should resolve on an array with a non-empty result set with variables', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([
        quad('_:b', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v1'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v2'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v3'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#solution', '_:s1'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#solution', '_:s2'),

        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b1'),
        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b2'),
        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b3'),
        quad('_:b1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v1'),
        quad('_:b1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V1"'),
        quad('_:b2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v2'),
        quad('_:b2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V2"'),
        quad('_:b3', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v3'),
        quad('_:b3', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V3"'),

        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b4'),
        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b5'),
        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b6'),
        quad('_:b4', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v1'),
        quad('_:b4', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V1a"'),
        quad('_:b5', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v2'),
        quad('_:b5', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V2a"'),
        quad('_:b6', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v3'),
        quad('_:b6', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V3a"'),
      ])).resolves.toEqual({
        checkOrder: false,
        type: 'bindings',
        value: [
          {
            '?v1': DF.literal('V1'),
            '?v2': DF.literal('V2'),
            '?v3': DF.literal('V3'),
          },
          {
            '?v1': DF.literal('V1a'),
            '?v2': DF.literal('V2a'),
            '?v3': DF.literal('V3a'),
          },
        ],
        variables: [ '?v1', '?v2', '?v3' ],
      });
    });

    it('should resolve on an array with a sorted result set with variables', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseDawgResultSet([
        quad('_:b', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#ResultSet'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v1'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v2'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#resultVariable', 'v3'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#solution', '_:s1'),
        quad('_:b', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#solution', '_:s2'),

        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#index', '"1"'),
        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b1'),
        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b2'),
        quad('_:s1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b3'),
        quad('_:b1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v1'),
        quad('_:b1', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V1"'),
        quad('_:b2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v2'),
        quad('_:b2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V2"'),
        quad('_:b3', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v3'),
        quad('_:b3', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V3"'),

        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#index', '"0"'),
        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b4'),
        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b5'),
        quad('_:s2', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#binding', '_:b6'),
        quad('_:b4', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v1'),
        quad('_:b4', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V1a"'),
        quad('_:b5', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v2'),
        quad('_:b5', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V2a"'),
        quad('_:b6', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#variable', 'v3'),
        quad('_:b6', 'http://www.w3.org/2001/sw/DataAccess/tests/result-set#value', '"V3a"'),
      ])).resolves.toEqual({
        checkOrder: true,
        type: 'bindings',
        value: [
          {
            '?v1': DF.literal('V1a'),
            '?v2': DF.literal('V2a'),
            '?v3': DF.literal('V3a'),
          },
          {
            '?v1': DF.literal('V1'),
            '?v2': DF.literal('V2'),
            '?v3': DF.literal('V3'),
          },
        ],
        variables: [ '?v1', '?v2', '?v3' ],
      });
    });
  });

  describe('#parseSparqlTsvResults', () => {
    it('should parse a single-line true boolean', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(`true\n`))).resolves
        .toEqual({ type: 'boolean', value: true });
    });

    it('should parse a single-line false boolean', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(`False`))).resolves
        .toEqual({ type: 'boolean', value: false });
    });

    it('should parse a single-line result that is not a boolean', async() => {
      const tsv = `?x`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          variables: [ '?x' ],
          value: [],
        });
    });

    it('should parse standard TSV bindings with missing/empty fields', async() => {
      const tsv = `?x\t?y\t?z\n<http://example.org/a>\t"str"\t123\n<http://example.org/b>\t\t45.6`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          variables: [ '?x', '?y', '?z' ],
          value: [
            {
              '?x': DF.namedNode('http://example.org/a'),
              '?y': DF.literal('str'),
              '?z': DF.literal('123', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
            },
            {
              '?x': DF.namedNode('http://example.org/b'),
              '?z': DF.literal('45.6', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
            },
          ],
        });
    });

    it('should parse a zero-variable result row', async() => {
      const tsv = `\n\n\n`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).resolves
        .toEqual({
          checkOrder: false,
          type: 'bindings',
          variables: [],
          value: [{}, {}],
        });
    });

    it('should reject on an empty column in the header', async() => {
      const tsv = `?x\t\t?z\n<ex:a>\t<ex:b>\t<ex:c>`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).rejects
        .toThrow('Invalid TSV result: Empty column on the first row.');
    });

    it('should reject on invalid variable formats', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(`x\t?y\n<ex:a>\t<ex:b>`))).rejects
        .toThrow('Invalid TSV variable: x');
    });

    it('should reject on duplicate variables', async() => {
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(`?x\t?x\n<ex:a>\t<ex:a>`))).rejects
        .toThrow('Invalid TSV result: The variable ?x is declared twice.');
    });

    it('should reject on mismatched column count in rows', async() => {
      const tsv = `?x\t?y\n<http://example.org/a>`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).rejects
        .toThrow('Invalid TSV row (Line 2): expected 2 fields but found 1.');
    });

    it('should reject on invalid Turtle syntax in a cell', async() => {
      const tsv = `?x\nbad_unquoted_term`;
      return expect(TestCaseQueryEvaluationHandler.parseSparqlTsvResults(streamifyString(tsv))).rejects
        .toThrow(/Failed to parse TSV value on Line 2, Column '\?x'/u);
    });
  });

  describe('#parseTsvTerm', () => {
    it('should parse integers', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('123')).toEqual(
        DF.literal('123', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('-42')).toEqual(
        DF.literal('-42', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('+7')).toEqual(
        DF.literal('+7', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')),
      );
    });

    it('should parse decimals', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('12.34')).toEqual(
        DF.literal('12.34', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('.5')).toEqual(
        DF.literal('.5', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('-0.99')).toEqual(
        DF.literal('-0.99', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      );
    });

    it('should parse doubles', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('1.2e3')).toEqual(
        DF.literal('1.2e3', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('-5E-4')).toEqual(
        DF.literal('-5E-4', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')),
      );
    });

    it('should parse booleans', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('true')).toEqual(
        DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')),
      );
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('false')).toEqual(
        DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')),
      );
    });

    it('should fallback to stringToTtlTerm for URIs', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('<http://example.org/>')).toEqual(
        DF.namedNode('http://example.org/'),
      );
    });

    it('should fallback to stringToTtlTerm for plain literals', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('"hello"')).toEqual(
        DF.literal('hello'),
      );
    });

    it('should fallback to stringToTtlTerm for language tagged literals', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('"hello"@en')).toEqual(
        DF.literal('hello', 'en'),
      );
    });

    it('should fallback to stringToTtlTerm for typed literals', () => {
      expect(TestCaseQueryEvaluationHandler.parseTsvTerm('"xyz"^^<http://example.org/type>')).toEqual(
        DF.literal('xyz', DF.namedNode('http://example.org/type')),
      );
    });
  });

  describe('#queryDataLinksToString', () => {
    it('should handle the empty array', () => {
      expect(TestCaseQueryEvaluation.queryDataLinksToString([])).toBe(``);
    });

    it('should handle a non-empty array', () => {
      expect(TestCaseQueryEvaluation.queryDataLinksToString([
        { dataUri: 'ex:uri1' },
        { dataUri: 'ex:uri2', dataGraph: DF.namedNode('ex:graph') },
      ])).toBe(`ex:uri1,
    ex:uri2 (named graph: ex:graph)`);
    });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseQueryEvaluation', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
    });

    it('should produce a TestCaseQueryEvaluation with lax cardinality', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      resource.addProperty(pCardinality, new Resource({ context, term: DF.namedNode(
        'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#LaxCardinality',
      ) }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(true);
    });

    it('should produce a TestCaseQueryEvaluation with data in action', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pData, new Resource({ term: DF.namedNode('RESULT.ttl'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should produce a TestCaseQueryEvaluation with raw graph data in action', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.namedNode('RESULT.ttl'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"', 'RESULT.ttl'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"', 'RESULT.ttl'),
      ]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should produce a TestCaseQueryEvaluation with labelled graph data in action', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('action'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const graphData = new Resource({ term: DF.namedNode('graphData'), context });
      graphData.addProperty(pLabel, new Resource({ term: DF.namedNode('http://ex.org/graph'), context }));
      graphData.addProperty(pGraph, new Resource({ term: DF.namedNode('RESULT.ttl'), context }));
      action.addProperty(pGraphData, graphData);
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"', 'http://ex.org/graph'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"', 'http://ex.org/graph'),
      ]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should produce a TestCaseQueryEvaluation with multiple raw graph data in action', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.namedNode('RESULT1.ttl'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.namedNode('RESULT2.ttl'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.namedNode('RESULT3.ttl'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'RESULT1.ttl'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"', 'RESULT2.ttl'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"C"', 'RESULT3.ttl'),
      ]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should produce a TestCaseQueryEvaluation with multiple labelled graph data in action', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('action'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));

      const graphData1 = new Resource({ term: DF.namedNode('graphData'), context });
      graphData1.addProperty(pLabel, new Resource({ term: DF.namedNode('http://ex.org/graph1'), context }));
      graphData1.addProperty(pGraph, new Resource({ term: DF.namedNode('RESULT1.ttl'), context }));
      action.addProperty(pGraphData, graphData1);

      const graphData2 = new Resource({ term: DF.namedNode('graphData'), context });
      graphData2.addProperty(pLabel, new Resource({ term: DF.namedNode('http://ex.org/graph2'), context }));
      graphData2.addProperty(pGraph, new Resource({ term: DF.namedNode('RESULT2.ttl'), context }));
      action.addProperty(pGraphData, graphData2);

      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseQueryEvaluation);
      expect(testCase.type).toBe('sparql');
      expect(testCase.queryString).toBe(`OK`);
      expect(testCase.queryData).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'http://ex.org/graph1'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"', 'http://ex.org/graph2'),
      ]);
      expect(testCase.queryResult.type).toBe('quads');
      expect(testCase.queryResult.value).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.laxCardinality).toBe(false);
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without query in action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseQueryEvaluation that tests true on equal results', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should produce TestCaseQueryEvaluation that tests false on non-equal results', async() => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT_OTHER.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(engine, {})).rejects.toBeTruthy();
    });
  });
});
