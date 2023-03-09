import {TestCaseEval, TestCaseEvalHandler} from "../../../lib/testcase/rdfsyntax/TestCaseEval";
const quad = require("rdf-quad");
import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {RdfXmlParser} from "rdfxml-streaming-parser";
import arrayifyStream from "arrayify-stream";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'https://example.org/myTestFile':
    body = streamifyString(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 1" />
  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 2" />
  <rdf:Description rdf:about="#this"
             dc:title="A test document" />

</rdf:RDF>`);
    break;
  case 'RESULT.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".
    <https://example.org/myTestFile#this> <http://purl.org/dc/elements/1.1/title> "A test document" .
    `);
    break;
  case 'NORM_RESULT.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".
    <http://example.org/myTestFile#this> <http://purl.org/dc/elements/1.1/title> "A test document" .
    `);
    break;
  case 'RESULT_OTHER.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar_ABC> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".
    <https://example.org/myTestFile#this> <http://purl.org/dc/elements/1.1/title> "A test document" .
    `);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200 }));
};

describe('TestCaseEvalHandler', () => {

  let handler: TestCaseEvalHandler;
  const parser = {
    parse: (data: string, baseIRI: string) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new RdfXmlParser({ baseIRI })))),
  };

  let context;
  let pAction;
  let pResult;

  beforeEach((done) => {
    handler = new TestCaseEvalHandler();
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseEval', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('https://example.org/myTestFile'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseEval);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 1" />
  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 2" />
  <rdf:Description rdf:about="#this"
             dc:title="A test document" />

</rdf:RDF>`);
      expect(testCase.expected).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
        quad('https://example.org/myTestFile#this', 'http://purl.org/dc/elements/1.1/title',
          '"A test document"'),
      ]);
      expect(testCase.baseIRI).toEqual('https://example.org/myTestFile');
    });

    it('should produce a TestCaseEval with a normalized URL', async () => {
      handler = new TestCaseEvalHandler({ normalizeUrl: true });
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('https://example.org/myTestFile'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('NORM_RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseEval);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 1" />
  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 2" />
  <rdf:Description rdf:about="#this"
             dc:title="A test document" />

</rdf:RDF>`);
      expect(testCase.expected).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
        quad('http://example.org/myTestFile#this', 'http://purl.org/dc/elements/1.1/title',
          '"A test document"'),
      ]);
      expect(testCase.baseIRI).toEqual('http://example.org/myTestFile');
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('https://example.org/myTestFile'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseEval that tests true on isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('https://example.org/myTestFile'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseEval that tests false on isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('https://example.org/myTestFile'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT_OTHER.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects.toBeTruthy();
    });
  });
});
