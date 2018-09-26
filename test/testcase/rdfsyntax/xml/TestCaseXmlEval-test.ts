import {TestCaseXmlEval, TestCaseXmlEvalHandler} from "../../../../lib/testcase/rdfsyntax/xml/TestCaseXmlEval";
const quad = require("rdf-quad");
import {literal, namedNode} from "@rdfjs/data-model";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {RdfXmlParser} from "rdfxml-streaming-parser";

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'ACTION':
    body = streamifyString(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 1" />
  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 2" />

</rdf:RDF>`);
    break;
  case 'RESULT.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  case 'RESULT_OTHER.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar_ABC> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseXmlEvalHandler', () => {

  const handler = new TestCaseXmlEvalHandler();
  const parser = {
    parse: (data: string, baseIRI: string) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new RdfXmlParser({ baseIRI })))),
  };

  let context;
  let pAction;
  let pResult;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseXmlEval', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseXmlEval);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">

  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 1" />
  <rdf:Description rdf:about="http://www.w3.org/TR/rdf-syntax-grammar"
             dc:title="RDF1.1 XML Syntax 2" />

</rdf:RDF>`);
      expect(testCase.expected).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.baseIRI).toEqual('ACTION');
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseXmlEval that tests true on isomorphic data', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser)).resolves.toBe(undefined);
    });

    it('should produce TestCaseXmlEval that tests false on isomorphic data', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: literal('RESULT_OTHER.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser)).rejects.toBeTruthy();
    });
  });

});
