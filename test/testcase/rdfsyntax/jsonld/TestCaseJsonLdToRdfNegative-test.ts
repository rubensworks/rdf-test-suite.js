import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {TestCaseJsonLdToRdfNegativeHandler,
} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdToRdfNegative";
import {TestCaseSyntax} from "../../../../lib/testcase/rdfsyntax/TestCaseSyntax";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'http://ex.org/action.ttl':
  case 'ACTION':
    body = streamifyString(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`);
    break;
  case 'ERROR':
    body = streamifyString('ERROR');
    break;
  case 'ERRORCODE':
    body = streamifyString('ERRORCODE');
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseJsonLdToRdfNegativeHandler', () => {

  const handler = new TestCaseJsonLdToRdfNegativeHandler();
  const parser = {
    parse: async (data: string, baseIRI: string, injectArguments: any) => {
      if (data === 'ERROR') {
        throw new Error('ERROR');
      } else if (data === 'ERRORCODE') {
        const error = new Error('ERROR');
        (<any> error).code = 'CODE';
        throw error;
      }
      return [];
    },
  };

  let context;
  let pAction;
  let pResult;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });

        done();
      });
    jest.clearAllMocks();
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseEval', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseSyntax);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`);
      expect(testCase.expectErrorCode).toEqual('CODE');
      const spy = jest.spyOn(parser, 'parse');
      try {
        await testCase.test(parser, {});
      } catch (e) {
        // Ignore error
      }
      return expect(spy).toHaveBeenCalledWith(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`, "ACTION",
        {
          produceGeneralizedRdf: false,
        });
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseEval that tests true when the expected error code is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ERRORCODE'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseEval that tests false when no error is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects
        .toThrow(new Error(`Expected to throw an error with code 'CODE' when parsing.
  Input: {
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}
`));
    });

    it('should produce TestCaseEval that tests false when an error with different error code is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ERROR'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects
        .toThrow(new Error('Received invalid error code, expected CODE, but got undefined (ERROR)'));
    });
  });

});
