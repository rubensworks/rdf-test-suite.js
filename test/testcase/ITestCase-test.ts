/* tslint:disable:no-console */
import {DataFactory} from "rdf-data-factory";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {testCaseFromResource} from "../../lib/testcase/ITestCase";

const DF = new DataFactory();

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
  let rApproval;
  let pApprovedBy;
  let pComment;
  let pName;
  const _console = globalThis.console;

  beforeEach((done) => {
    // @ts-ignore
    globalThis.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
    new ContextParser().parse(require('../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pType = new Resource(
          { term: DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), context });
        pApproval = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-dawg#approval'), context });
        rApproval = new Resource(
          { term: DF.namedNode('http://www.w3.org/ns/rdftest#approval'), context });
        pApprovedBy = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-dawg#approvedBy'), context });
        pComment = new Resource(
          { term: DF.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), context });
        pName = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#name'), context });

        done();
      });
  });

  afterAll(() => {
    // Restore the console
    globalThis.console = _console;
  });


  describe('#testCaseFromResource', () => {
    it('should return null on no test case types', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1') });
      expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
      expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should return null on unknown test case types', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('unknown'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should return null on an erroring test case handler', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('error'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toBe(null);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should return a test case for a valid type without optional properties', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('abc'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: null,
        approvedBy: null,
        comment: null,
        name: null,
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
      expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should return a test case for a valid type with optional properties', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('abc'), context}));
      resource.addProperty(pApproval, new Resource({ term: DF.literal('APPROVAL'), context}));
      resource.addProperty(pApprovedBy, new Resource({ term: DF.literal('APPROVED_BY'), context}));
      resource.addProperty(pComment, new Resource({ term: DF.literal('COMMENT'), context}));
      resource.addProperty(pName, new Resource({ term: DF.literal('NAME'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: 'APPROVAL',
        approvedBy: 'APPROVED_BY',
        comment: 'COMMENT',
        name: 'NAME',
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
      expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should return a test case for a valid type with optional properties with dawg:approval and rdft:approval',
    async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('abc'), context}));
      resource.addProperty(pApproval, new Resource({ term: DF.literal('APPROVAL'), context}));
      resource.addProperty(rApproval, new Resource({ term: DF.literal('R_APPROVAL'), context}));
      resource.addProperty(pApprovedBy, new Resource({ term: DF.literal('APPROVED_BY'), context}));
      resource.addProperty(pComment, new Resource({ term: DF.literal('COMMENT'), context}));
      resource.addProperty(pName, new Resource({ term: DF.literal('NAME'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: 'APPROVAL',
        approvedBy: 'APPROVED_BY',
        comment: 'COMMENT',
        name: 'NAME',
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
      expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should return a test case for a valid type with optional properties with rdft:apporval', async () => {
      const resource = new Resource({ term: DF.namedNode('http://example.org/test1'), context });
      resource.addProperty(pType, new Resource({ term: DF.namedNode('abc'), context}));
      resource.addProperty(rApproval, new Resource({ term: DF.literal('R_APPROVAL'), context}));
      resource.addProperty(pApprovedBy, new Resource({ term: DF.literal('APPROVED_BY'), context}));
      resource.addProperty(pComment, new Resource({ term: DF.literal('COMMENT'), context}));
      resource.addProperty(pName, new Resource({ term: DF.literal('NAME'), context}));
      expect(await testCaseFromResource(handlers, null, resource)).toEqual({
        approval: 'R_APPROVAL',
        approvedBy: 'APPROVED_BY',
        comment: 'COMMENT',
        name: 'NAME',
        test: true,
        types: [ 'abc' ],
        uri: 'http://example.org/test1',
      });
      expect(console.error).toHaveBeenCalledTimes(0);
    });
  });
});
