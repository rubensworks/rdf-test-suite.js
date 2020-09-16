import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser, JsonLdContextNormalized} from "jsonld-context-parser";
import * as RDF from "rdf-js";
import {Resource} from "rdf-object";
import {
  TestCaseJsonLdFromRdfHandlerNegative, TestCaseJsonLdFromRdfNegativeHandler,
} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdFromRdfNegative";
import {ErrorSkipped} from "../../../../lib/ErrorSkipped";

const quad = require("rdf-quad");
const DF = new DataFactory();

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'http://ex.org/action.ttl':
  case 'ACTION.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  case 'ERROR.ttl':
    body = streamifyString('<ex:ERROR> <ex:p> <ex:o>.');
    break;
  case 'ERRORCODE.ttl':
    body = streamifyString('<ex:ERRORCODE> <ex:p> <ex:o>.');
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseJsonLdFromRdfNegativeHandler', () => {

  const handler = new TestCaseJsonLdFromRdfNegativeHandler();
  const serializer = {
    serialize: async (data: RDF.Quad[]) => {
      if (data[0].subject.value === 'ex:ERROR') {
        throw new Error('ERROR');
      } else if (data[0].subject.value === 'ex:ERRORCODE') {
        const error = new Error('ERROR');
        (<any> error).code = 'CODE';
        throw error;
      }
      return '';
    },
  };

  let context: JsonLdContextNormalized;
  let pAction: Resource;
  let pResult: Resource;

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
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseJsonLdFromRdfHandlerNegative);
      expect(testCase.type).toEqual('fromrdfsyntax');
      expect(testCase.data).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.expectErrorCode).toEqual('CODE');
      const spy = jest.spyOn(serializer, 'serialize');
      try {
        await testCase.test(serializer, {});
      } catch (e) {
        // Ignore error
      }
      const calls: any = spy.mock.calls;
      expect(calls[0][0]).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(calls[0][1]).toEqual("ACTION.ttl");
      expect(calls[0][2]).toEqual({
        normalizeUrl: true,
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
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseEval that tests true when the expected error code is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ERRORCODE.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(serializer, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseEval that tests false when no error is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(serializer, {})).rejects
        .toThrow(new Error(`Expected to throw an error with code 'CODE' when parsing.
  Input:
    {"subject":"http://www.w3.org/TR/rdf-syntax-grammar","predicate":"http://purl.org/dc/elements/1.1/title","object":"\\"RDF1.1 XML Syntax 1\\"","graph":""},
    {"subject":"http://www.w3.org/TR/rdf-syntax-grammar","predicate":"http://purl.org/dc/elements/1.1/title","object":"\\"RDF1.1 XML Syntax 2\\"","graph":""}
`));
    });

    it('should produce TestCaseEval that tests false when an error with different error code is thrown', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ERROR.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(serializer, {})).rejects
        .toThrow(new Error('Received invalid error code, expected CODE, but got undefined (ERROR)'));
    });

    it('should produce TestCaseEval that propagates skipped tests', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('CODE'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const mySerializer = {
        serialize: () => Promise.reject(new ErrorSkipped('Skipped')),
      };
      return expect(testCase.test(mySerializer, {})).rejects.toThrow(new ErrorSkipped('Skipped'));
    });

  });

});
