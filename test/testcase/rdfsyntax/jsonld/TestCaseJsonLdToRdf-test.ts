import {TestCaseJsonLdToRdfHandler} from "../../../../lib/testcase/rdfsyntax/jsonld/TestCaseJsonLdToRdf";
const quad = require("rdf-quad");
import {DataFactory} from "rdf-data-factory";
import "jest-rdf";
import {ContextParser} from "jsonld-context-parser";
import {JsonLdParser} from "jsonld-streaming-parser";
import {Resource} from "rdf-object";
import {TestCaseEval} from "../../../../lib/testcase/rdfsyntax/TestCaseEval";

// tslint:disable:no-var-requires
const arrayifyStream = require('arrayify-stream');
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
  case 'RESULT.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  case 'RESULT_OTHER.ttl':
    body = streamifyString(`<http://www.w3.org/TR/rdf-syntax-grammar_ABC> <http://purl.org/dc/elements/1.1/title>
    "RDF1.1 XML Syntax 1", "RDF1.1 XML Syntax 2".`);
    break;
  case 'CONTEXT':
    body = streamifyString(`{ "@context": { "@base": "http://www.w3.org/TR/" } }`);
    break;
  case 'http://ex.org/CONTEXT':
    body = streamifyString(`{ "@context": { "@base": "http://www.w3.org/TR/BASED/" } }`);
    break;
  default:
    return Promise.reject(new Error('Fetch error'));
    break;
  }
  return Promise.resolve(new Response(body, <any> { headers: new Headers({ a: 'b' }), status: 200, url }));
};

describe('TestCaseJsonLdToRdfHandler', () => {

  const handler = new TestCaseJsonLdToRdfHandler();
  const parser = {
    parse: (data: string, baseIRI: string, injectArguments: any) => Promise.resolve(arrayifyStream(streamifyString(data)
      .pipe(new JsonLdParser({ baseIRI })))),
  };

  let context;
  let pAction;
  let pResult;
  let pContext;
  let pOption;
  let pJsonLdProduceGeneralizedRdf;
  let pJsonLdBase;
  let pJsonLdExpandContext;
  let pProcessingMode;
  let pSpecVersion;
  let pRdfDirection;
  let pExtractAllScripts;
  let pContentType;

  beforeEach((done) => {
    new ContextParser().parse(require('../../../../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pAction = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
        pResult = new Resource(
          { term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });
        pContext = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#context'), context });
        pOption = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#option'), context });
        pJsonLdProduceGeneralizedRdf = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#produceGeneralizedRdf'), context });
        pJsonLdBase = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#base'), context });
        pJsonLdExpandContext = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#expandContext'), context });
        pProcessingMode = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#processingMode'), context });
        pSpecVersion = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#specVersion'), context });
        pRdfDirection = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#rdfDirection'), context });
        pExtractAllScripts = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#extractAllScripts'), context });
        pContentType = new Resource(
          { term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#contentType'), context });

        done();
      });
    jest.clearAllMocks();
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseEval', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseEval);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`);
      expect(testCase.expected).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.baseIRI).toEqual('ACTION');
      const spy = jest.spyOn(parser, 'parse');
      testCase.test(parser, {});
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

    it('should produce a TestCaseEval with all optional data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      resource.addProperty(pContext, new Resource({ term: DF.literal('CONTEXT'), context }));

      const optionGeneralized = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionGeneralized.addProperty(pJsonLdProduceGeneralizedRdf, new Resource({ term: DF.literal('true'), context }));
      const optionBase = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionBase.addProperty(pJsonLdBase, new Resource({ term: DF.namedNode('http://base.org/'), context }));
      const optionProcessingMode = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionProcessingMode.addProperty(pProcessingMode, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionSpecVersion = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionSpecVersion.addProperty(pSpecVersion, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionRdfDirection = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionRdfDirection.addProperty(pRdfDirection, new Resource({ term: DF.literal('compound-DF.literal('), context }));

      resource.addProperty(pOption, optionGeneralized);
      resource.addProperty(pOption, optionBase);
      resource.addProperty(pOption, optionProcessingMode);
      resource.addProperty(pOption, optionSpecVersion);
      resource.addProperty(pOption, optionRdfDirection);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const spy = jest.spyOn(parser, 'parse');
      await testCase.test(parser, {});
      return expect(spy).toHaveBeenCalledWith(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`, "ACTION",
        {
          baseIRI: "http://base.org/",
          context: { "@context": {"@base": "http://www.w3.org/TR/"} },
          processingMode: "1.1",
          produceGeneralizedRdf: true,
          specVersion: "1.1",
          rdfDirection: "compound-DF.literal(",
        });
    });

    it('should produce a TestCaseEval with an expand context', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('http://ex.org/action.ttl'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));

      const optionExpandContext = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionExpandContext.addProperty(pJsonLdExpandContext,
        new Resource({ term: DF.literal('CONTEXT'), context }));

      resource.addProperty(pOption, optionExpandContext);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const spy = jest.spyOn(parser, 'parse');
      await testCase.test(parser, {});
      return expect(spy).toHaveBeenCalledWith(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`, "http://ex.org/action.ttl",
        {
          context: { "@context": {"@base": "http://www.w3.org/TR/BASED/"} },
          produceGeneralizedRdf: false,
        });
    });

    it('should error on a resource without action', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should error on a resource without result', () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      return expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
    });

    it('should produce TestCaseEval that tests true on isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).resolves.toBe(undefined);
    });

    it('should produce TestCaseEval that tests false on non-isomorphic data', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT_OTHER.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      return expect(testCase.test(parser, {})).rejects.toBeTruthy();
    });

    it('should produce a TestCaseEval when HTML', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(
        new Resource({ term: DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), context }),
        new Resource({ term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#HtmlTest'), context }));
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      expect(testCase).toBeInstanceOf(TestCaseEval);
      expect(testCase.type).toEqual('rdfsyntax');
      expect(testCase.data).toEqual(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`);
      expect(testCase.expected).toEqualRdfQuadArray([
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 1"'),
        quad('http://www.w3.org/TR/rdf-syntax-grammar', 'http://purl.org/dc/elements/1.1/title',
          '"RDF1.1 XML Syntax 2"'),
      ]);
      expect(testCase.baseIRI).toEqual('ACTION');
      const spy = jest.spyOn(parser, 'parse');
      await testCase.test(parser, {});
      return expect(spy).toHaveBeenCalledWith(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`, "ACTION",
        {
          produceGeneralizedRdf: false,
          contentType: 'text/html',
        });
    });

    it('should produce a TestCaseEval with all optional data when HTML', async () => {
      const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
      resource.addProperty(
        new Resource({ term: DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), context }),
        new Resource({ term: DF.namedNode('https://w3c.github.io/json-ld-api/tests/vocab#HtmlTest'), context }));
      resource.addProperty(pAction, new Resource({ term: DF.literal('ACTION'), context }));
      resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.ttl'), context }));
      resource.addProperty(pContext, new Resource({ term: DF.literal('CONTEXT'), context }));

      const optionGeneralized = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionGeneralized.addProperty(pJsonLdProduceGeneralizedRdf, new Resource({ term: DF.literal('true'), context }));
      const optionBase = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionBase.addProperty(pJsonLdBase, new Resource({ term: DF.namedNode('http://base.org/'), context }));
      const optionProcessingMode = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionProcessingMode.addProperty(pProcessingMode, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionSpecVersion = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionSpecVersion.addProperty(pSpecVersion, new Resource({ term: DF.literal('json-ld-1.1'), context }));
      const optionRdfDirection = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionRdfDirection.addProperty(pRdfDirection, new Resource({ term: DF.literal('compound-DF.literal('), context }));
      const optionExtractAllScripts = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionExtractAllScripts.addProperty(pExtractAllScripts, new Resource({ term: DF.literal('false'), context }));
      const optionContentType = new Resource({ term: DF.namedNode('http://ex.org/o1'), context });
      optionContentType.addProperty(pContentType, new Resource({ term: DF.literal('CT'), context }));

      resource.addProperty(pOption, optionGeneralized);
      resource.addProperty(pOption, optionBase);
      resource.addProperty(pOption, optionProcessingMode);
      resource.addProperty(pOption, optionSpecVersion);
      resource.addProperty(pOption, optionRdfDirection);
      resource.addProperty(pOption, optionExtractAllScripts);
      resource.addProperty(pOption, optionContentType);
      const testCase = await handler.resourceToTestCase(resource, <any> {});
      const spy = jest.spyOn(parser, 'parse');
      await testCase.test(parser, {});
      return expect(spy).toHaveBeenCalledWith(`{
  "@id": "http://www.w3.org/TR/rdf-syntax-grammar",
  "http://purl.org/dc/elements/1.1/title": [
    "RDF1.1 XML Syntax 1",
    "RDF1.1 XML Syntax 2"
  ]
}`, "ACTION",
        {
          baseIRI: "http://base.org/",
          context: { "@context": {"@base": "http://www.w3.org/TR/"} },
          processingMode: "1.1",
          produceGeneralizedRdf: true,
          specVersion: "1.1",
          rdfDirection: "compound-DF.literal(",
          extractAllScripts: false,
          contentType: 'CT',
        });
    });
  });

});
