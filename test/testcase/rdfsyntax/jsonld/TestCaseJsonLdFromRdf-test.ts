import {
  objectsIsomorphic,
  TestCaseJsonLdFromRdfHandler,
} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdFromRdf";
const quad = require("rdf-quad");
import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import * as RDF from "@rdfjs/types";
import {Resource} from "rdf-object";
import {quadToStringQuad} from "rdf-string";
import {TestCaseJsonLdFromRdf} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdFromRdf";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');
const DF = new DataFactory();

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'ACTION.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  case 'RESULT':
    body = streamifyString(`[
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 1\\"",
    "graph": ""
  },
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 2\\"",
    "graph": ""
  }
]`);
    break;
  case 'RESULT_OTHER':
    body = streamifyString(`[
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar_A",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 1\\"",
    "graph": ""
  },
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar_A",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 2\\"",
    "graph": ""
  }
]`);
    break;
  case 'CONTEXT':
    body = streamifyString(`{ "@context": { "@base": "http://www.w3.org/TR/" } }`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseJsonLdFromRdfHandler', () => {

  const handler = new TestCaseJsonLdFromRdfHandler();
  const serializer = {
    serialize: (data: RDF.Quad[]) => Promise.resolve(JSON.stringify(data.map(quadToStringQuad), null, '  ')),
  };

  let context;
  let pAction;
  let pResult;
  let pOption;
  let pUseNativeTypes;
  let pUseRdfType;
  let pProcessingMode;
  let pSpecVersion;
  let pRdfDirection;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });
        pOption = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#option'), context });
        pUseNativeTypes = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#useNativeTypes'), context });
        pUseRdfType = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#useRdfType'), context });
        pProcessingMode = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#processingMode'), context });
        pSpecVersion = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#specVersion'), context });
        pRdfDirection = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#rdfDirection'), context });

        done();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseJsonLdFromRdf', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseJsonLdFromRdf);
      expect(testCase.type).toEqual('fromrdfsyntax');
      expect(testCase.data).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.expected).toEqual(`[
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 1\\"",
    "graph": ""
  },
  {
    "subject": "http://www.w3.org/TR/rdf-syntax-grammar",
    "predicate": "http://purl.org/dc/elements/1.1/title",
    "object": "\\"RDF1.1 XML Syntax 2\\"",
    "graph": ""
  }
]`);
      expect(testCase.baseIRI).toEqual('ACTION.ttl');
      const spy = jest.spyOn(serializer, 'serialize');
      testCase.test(serializer, {});
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

    it('should produce a TestCaseJsonLdFromRdf with all optional data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT'), context }));

      const optionUseNativeTypes = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionUseNativeTypes.addProperty(pUseNativeTypes, new Resource({ term: DF.literal('true'), context }));
      const optionUseRdfType = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionUseRdfType.addProperty(pUseRdfType, new Resource({ term: DF.literal('true'), context }));
      const optionProcessingMode = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionProcessingMode.addProperty(pProcessingMode, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionSpecVersion = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionSpecVersion.addProperty(pSpecVersion, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionRdfDirection = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionRdfDirection.addProperty(pRdfDirection, new Resource({ term: DF.literal('compound-DF.literal('), context }));

      resource.addProperty(pOption, optionUseNativeTypes);
      resource.addProperty(pOption, optionUseRdfType);
      resource.addProperty(pOption, optionProcessingMode);
      resource.addProperty(pOption, optionSpecVersion);
      resource.addProperty(pOption, optionRdfDirection);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const spy = jest.spyOn(serializer, 'serialize');
      testCase.test(serializer, {});
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
        processingMode: "1.1",
        useNativeTypes: true,
        useRdfType: true,
        specVersion: "1.1",
        rdfDirection: "compound-DF.literal(",
      });
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseJsonLdFromRdf that tests true on isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(serializer, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseJsonLdFromRdf that tests false on non-isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT_OTHER'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(serializer, {})).rejects.toBeTruthy();
    });
  });

});

describe('objectsIsomorphic', () => {
  it('should be true for empty objects', () => {
    expect(objectsIsomorphic({}, {})).toBeTruthy();
  });

  it('should be false when obj1 has more keys than obj2', () => {
    expect(objectsIsomorphic({ a: 'b' }, {})).toBeFalsy();
  });

  it('should be false when obj1 has less keys than obj2', () => {
    expect(objectsIsomorphic({}, { a: 'b' })).toBeFalsy();
  });

  it('should be false when obj1 also has less keys than obj2', () => {
    expect(objectsIsomorphic({ a: 'b' }, { a: 'b', x: 'z' })).toBeFalsy();
  });

  it('should be true when obj1 and obj2 both have 1 equal key', () => {
    expect(objectsIsomorphic({ a: 'b' }, { a: 'b' })).toBeTruthy();
  });

  it('should be false when obj1 and obj2 both have 1 equal key with different value', () => {
    expect(objectsIsomorphic({ a: 'b' }, { a: 'c' })).toBeFalsy();
  });

  it('should be true when obj1 and obj2 are equal nested', () => {
    expect(objectsIsomorphic({ a: { x: 'b', y: 1 } }, { a: { x: 'b', y: 1 } })).toBeTruthy();
  });

  it('should be false when obj1 and obj2 are non-equal nested', () => {
    expect(objectsIsomorphic({ a: { x: 'b', y: 2 } }, { a: { x: 'b', y: 1 } })).toBeFalsy();
  });

  it('should be true for identical blank nodes', () => {
    expect(objectsIsomorphic({ a: '_:b' }, { a: '_:b' })).toBeTruthy();
  });

  it('should be true for non-identical blank nodes', () => {
    expect(objectsIsomorphic({ a: '_:b1' }, { a: '_:b2' })).toBeTruthy();
  });

  it('should be true for identical blank nodes for strict bnodes', () => {
    expect(objectsIsomorphic({ a: '_:b' }, { a: '_:b' }, { strictBlankNodes: true })).toBeTruthy();
  });

  it('should be false for non-identical blank nodes for strict bnodes', () => {
    expect(objectsIsomorphic({ a: '_:b1' }, { a: '_:b2' }, { strictBlankNodes: true })).toBeFalsy();
  });

  it('should be true for unsorted arrays', () => {
    expect(objectsIsomorphic([{ a: '0' }, { b: '1' }], [{ b: '1' }, { a: '0' }])).toBeTruthy();
  });

  it('should be true for unequal arrays', () => {
    expect(objectsIsomorphic([{ a: '0' }, { b: '1' }], [{ b: '2' }, { a: '0' }])).toBeFalsy();
  });
});
