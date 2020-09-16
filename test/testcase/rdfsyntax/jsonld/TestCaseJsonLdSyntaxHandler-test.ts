import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {JsonLdParser} from "jsonld-streaming-parser";
import {Resource} from "rdf-object";
import {ErrorSkipped} from "../../../../lib/ErrorSkipped";
import {
  TestCaseJsonLdSyntaxHandler,
} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdSyntax";
import {TestCaseSyntax} from "../../../../lib/testcase/rdfsyntax/TestCaseSyntax";

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'ACTION.ok':
    body = streamifyString(`{
  "@id": "http://ex.org/abc",
  "http://ex.org/p": "value"
}`);
    break;
  case 'ACTION.invalid':
    body = streamifyString(`{
  """@id": "http://ex.org/abc",
  "http://ex.org/p": "value"
}`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseJsonLdSyntaxHandler', () => {

  const handler = new TestCaseJsonLdSyntaxHandler(false);
  const parser = {
    parse: (data: string, baseIRI: string) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new JsonLdParser({ baseIRI })))),
  };

  let context;
  let pAction;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseJsonLdSyntaxHandler', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseSyntax);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`{
  "@id": "http://ex.org/abc",
  "http://ex.org/p": "value"
}`);
      expect(testCase.baseIRI).toEqual('ACTION.ok');
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseJsonLdSyntaxHandler that tests true on invalid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.invalid'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseJsonLdSyntaxHandler that tests false on valid data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseJsonLdSyntaxHandler that rejects with a skipped error when skipped', async () => {
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
