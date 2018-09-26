import {literal, namedNode} from "@rdfjs/data-model";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {testCaseFromResource} from "../../lib/testcase/ITestCase";

const handlers: any = {
  abc: {
    resourceToTestCase: (resource, data) => Promise.resolve({ ...data, test: true }),
  },
  error: {
    resourceToTestCase: () => Promise.reject(new Error('Test case handler error')),
  },
};

describe('ITestCase', () => {

  let context;
  let pType;
  let pApproval;
  let pApprovedBy;
  let pComment;
  let pName;

  beforeEach((done) => {
    new ContextParser().parse(require('../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pType = new Resource(
          { term: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), context });
        pApproval = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-dawg#approval'), context });
        pApprovedBy = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-dawg#approvedBy'), context });
        pComment = new Resource(
          { term: namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), context });
        pName = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#name'), context });

        done();
      });
  });

  describe('#testCaseFromResource', () => {
    it('should return null on no test case types', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/test1') });
      return expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
    });

    it('should return null on unknown test case types', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: namedNode('unknown'), context}));
      return expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
    });

    it('should return null on an erroring test case handler', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: namedNode('error'), context}));
      return expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
    });

    it('should return a test case for a valid type without optional properties', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: namedNode('abc'), context}));
      return expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: null,
        approvedBy: null,
        comment: null,
        name: null,
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
    });

    it('should return a test case for a valid type with optional properties', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: namedNode('abc'), context}));
      resource.addProperty(pApproval, new Resource({ term: literal('APPROVAL'), context}));
      resource.addProperty(pApprovedBy, new Resource({ term: literal('APPROVED_BY'), context}));
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pName, new Resource({ term: literal('NAME'), context}));
      return expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: 'APPROVAL',
        approvedBy: 'APPROVED_BY',
        comment: 'COMMENT',
        name: 'NAME',
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
    });
  });
});
