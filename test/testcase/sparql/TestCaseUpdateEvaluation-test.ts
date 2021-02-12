import {TestCaseUpdateEvaluation,
  TestCaseUpdateEvaluationHandler} from "../../../lib/testcase/sparql/TestCaseUpdateEvaluation";
const quad = require("rdf-quad");
import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import * as RDF from "rdf-js";
import {Resource} from "rdf-object";
import {QueryResultQuads} from "../../../lib/testcase/sparql/QueryResultQuads";
import { IUpdateEngine } from '../../../lib/testcase/sparql/IUpdateEngine';

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  let headers = new Headers({ a: 'b' });
  switch (url) {
  case 'ACTION.ok':
    body = streamifyString(`OK`);
    break;
  case 'ACTION.invalid':
    body = streamifyString(`INVALID`);
    break;
  case 'RESULT1.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title> "A".`);
    headers = new Headers({ 'Content-Type': 'text/turtle' });
    break;
  case 'RESULT2.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title> "B".`);
    headers = new Headers({ 'Content-Type': 'text/turtle' });
    break;
  default:
    return Promise.reject(new Error('Fetch error for ' + url));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers, status: 200, url }));
};

describe('TestCaseUpdateEvaluationHandler', () => {

  const handler = new TestCaseUpdateEvaluationHandler();
  const engine: IUpdateEngine = <any> {
    update: (data: RDF.Quad[], updateQueryString: string) => Promise.resolve([
      quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"'),
    ]),
  };

  let context;
  let pAction;
  let pResult;
  let pUpdateQuery;
  let pData;
  let pGraphData;
  let pGraph;
  let pLabel;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });
        pUpdateQuery = new Resource(
          { term: DF.namedNode('http://www.w3.org/2009/sparql/tests/test-update#request'), context });
        pData = new Resource(
          { term: DF.namedNode('http://www.w3.org/2009/sparql/tests/test-update#data'), context });
        pGraphData = new Resource(
          { term: DF.namedNode('http://www.w3.org/2009/sparql/tests/test-update#graphData'), context });
        pGraph = new Resource(
          { term: DF.namedNode('http://www.w3.org/2009/sparql/tests/test-update#graph'), context });
        pLabel = new Resource(
          { term: DF.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseUpdateEvaluation', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pData, new Resource({ term: DF.literal('RESULT1.ttl'), context }));
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseUpdateEvaluation);
      expect(testCase.type).toEqual('sparql');
      expect(testCase.updateQueryString).toEqual(`OK`);
      expect(testCase.dataInitial).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"'),
      ]);
      expect(testCase.dataExpected).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"'),
      ]);
      await expect(testCase.test(engine, {})).resolves.toBe(undefined);
    });

    it('should produce a TestCaseUpdateEvaluation with raw graph data in action', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.literal('RESULT1.ttl'), context }));
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pGraphData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseUpdateEvaluation);
      expect(testCase.type).toEqual('sparql');
      expect(testCase.updateQueryString).toEqual(`OK`);
      expect(testCase.dataInitial).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'RESULT1.ttl'),
      ]);
      expect(testCase.dataExpected).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"', 'RESULT2.ttl'),
      ]);
    });

    it('should produce a TestCaseUpdateEvaluation with labelled graph data in action', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const graphData = new Resource({ term: DF.namedNode('graphData'), context });
      graphData.addProperty(pLabel, new Resource({ term: DF.namedNode('http://ex.org/graph'), context }));
      graphData.addProperty(pGraph, new Resource({ term: DF.namedNode('RESULT1.ttl'), context }));
      action.addProperty(pGraphData, graphData);
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pGraphData, graphData);
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseUpdateEvaluation);
      expect(testCase.type).toEqual('sparql');
      expect(testCase.updateQueryString).toEqual(`OK`);
      expect(testCase.dataInitial).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'http://ex.org/graph'),
      ]);
      expect(testCase.dataExpected).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'http://ex.org/graph'),
      ]);
    });

    it('should produce a TestCaseUpdateEvaluation with multiple raw graph data in action', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.literal('RESULT1.ttl'), context }));
      action.addProperty(pGraphData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pGraphData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseUpdateEvaluation);
      expect(testCase.type).toEqual('sparql');
      expect(testCase.updateQueryString).toEqual(`OK`);
      expect(testCase.dataInitial).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"A"', 'RESULT1.ttl'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"', 'RESULT2.ttl'),
      ]);
      expect(testCase.dataExpected).toBeRdfIsomorphic([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title', '"B"', 'RESULT2.ttl'),
      ]);
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects
        .toThrowError('Missing mf:action in http://ex.org/test');
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects
        .toThrowError('Missing mf:result in http://ex.org/test');
    });

    it('should error on a resource without update query in action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      resource.addProperty(pAction, action);
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects
        .toThrowError('Missing ut:request in mf:action of http://ex.org/test');
    });

    it('should produce TestCaseUpdateEvaluation that tests true on equal results', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pData, new Resource({ term: DF.literal('RESULT1.ttl'), context }));
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});

      return expect(testCase.test(engine, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseUpdateEvaluation that tests false on non-equal results', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      const action = new Resource({ term: DF.namedNode('blabla'), context });
      action.addProperty(pUpdateQuery, new Resource({ term: DF.literal('ACTION.ok'), context }));
      action.addProperty(pData, new Resource({ term: DF.literal('RESULT2.ttl'), context }));
      resource.addProperty(pAction, action);
      const result = new Resource({ term: DF.namedNode('blabla2'), context });
      result.addProperty(pData, new Resource({ term: DF.literal('RESULT1.ttl'), context }));
      resource.addProperty(pResult, result);
      const testCase = await handler.resourceToTestCase(resource, <any> {});

      return expect(testCase.test(engine, {})).rejects.toBeTruthy();
    });
  });

});
