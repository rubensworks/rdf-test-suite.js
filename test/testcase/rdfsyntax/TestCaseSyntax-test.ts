import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {RdfXmlParser} from "rdfxml-streaming-parser";
import {ErrorSkipped} from "../../../lib/ErrorSkipped";
import {TestCaseSyntax, TestCaseSyntaxHandler} from "../../../lib/testcase/rdfsyntax/TestCaseSyntax";
import arrayifyStream from "arrayify-stream";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'ACTION.ok':
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
  case 'ACTION.invalid':
    body = streamifyString(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
            xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:ex="http://example.org/stuff/1.0/">
  <rdf:Description rdf:ID="abc" rdf:about="http://www.w3.org/TR/rdf-syntax-grammar" />
</rdf:RDF>`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200 }));
};

describe('TestCaseSyntaxHandler positive', () => {

  const handler = new TestCaseSyntaxHandler(true);
  const parser = {
    parse: (data: string, baseIRI: string) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new RdfXmlParser({ baseIRI })))),
  };

  let context;
  let pAction;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseSyntax', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseSyntax);
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
      expect(testCase.baseIRI).toEqual('ACTION.ok');
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseSyntax that tests false on invalid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.invalid'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseSyntax that tests true on valid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseSyntax that rejects with a skipped error when skipped', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const myParser = {
        parse: () => Promise.reject(new ErrorSkipped('Skipped')),
      };
      return expect(testCase.test(myParser, {})).rejects.toEqual(new ErrorSkipped('Skipped'));
    });
  });

});

describe('TestCaseSyntaxHandler negative', () => {

  const handler = new TestCaseSyntaxHandler(false);
  const parser = {
    parse: (data: string, baseIRI: string) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new RdfXmlParser({ baseIRI })))),
  };

  let context;
  let pAction;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseSyntax', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseSyntax);
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
      expect(testCase.baseIRI).toEqual('ACTION.ok');
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseSyntax that tests true on invalid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.invalid'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseSyntax that tests false on valid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects.toBeTruthy();
    });
  });

});
