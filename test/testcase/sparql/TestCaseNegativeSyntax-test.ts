import {TestCaseNegativeSyntax,
  TestCaseNegativeSyntaxHandler} from "../../../lib/testcase/sparql/TestCaseNegativeSyntax";
import {literal, namedNode} from "@rdfjs/data-model";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'ACTION.ok':
    body = streamifyString(`OK`);
    break;
  case 'ACTION.invalid':
    body = streamifyString(`INVALID`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseNegativeSyntaxHandler', () => {

  const handler = new TestCaseNegativeSyntaxHandler();
  const engine = {
    parse: (queryString: string) => queryString === 'OK'
      ? Promise.resolve(null) : Promise.reject(new Error('Invalid data ' + queryString)),
    query: () => Promise.reject(),
  };

  let context;
  let pAction;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });

        done();
      });
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseNegativeSyntax', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseNegativeSyntax);
      expect(testCase.type).toEqual('sparql');
      expect(testCase.queryString).toEqual(`OK`);
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseNegativeSyntax that tests true on invalid data', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION.invalid'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(engine)).resolves.toBe(undefined);
    });

    it('should produce TestCaseNegativeSyntax that tests false on valid data', async () => {
      const resource = new Resource({ term: namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: literal('ACTION.ok'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(engine)).rejects.toBeTruthy();
    });
  });

});
