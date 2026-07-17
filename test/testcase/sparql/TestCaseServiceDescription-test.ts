import { TestCaseServiceDescription, TestCaseServiceDescriptionHandler } from '../../../lib/testcase/sparql/TestCaseServiceDescription';

const endpoint = 'http://example.org/sparql';
let contentType: string;
let serviceDescription: string;

// Mock fetch
(<any> globalThis).fetch = (url: string) => {
  if (url !== endpoint) {
    return Promise.reject(new Error(`Fetch error for ${url}`));
  }
  return Promise.resolve(new Response(serviceDescription, <any> {
    headers: new Headers({ 'Content-Type': contentType }),
    status: 200,
  }));
};

describe('TestCaseServiceDescriptionHandler', () => {
  const handler = new TestCaseServiceDescriptionHandler();

  function testCaseData(name: string) {
    return {
      approval: null,
      approvedBy: null,
      comment: null,
      name,
      types: [ 'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ServiceDescriptionTest' ],
      uri: `http://example.org/${name}`,
    };
  }

  beforeEach(() => {
    contentType = 'text/turtle';
    serviceDescription = `@prefix sd: <http://www.w3.org/ns/sparql-service-description#> .
[] a sd:Service ;
  sd:endpoint <${endpoint}> .`;
  });

  describe('#resourceToTestCase', () => {
    it('should produce a TestCaseServiceDescription', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('GET on endpoint returns RDF'));

      expect(testCase).toBeInstanceOf(TestCaseServiceDescription);
      expect(testCase.type).toBe('sparql');
      expect(testCase.name).toBe('GET on endpoint returns RDF');
    });
  });

  describe('#test', () => {
    it('should require an endpoint', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('GET on endpoint returns RDF'));
      await expect(testCase.test(<any> {}, {})).rejects.toThrow('require the serviceDescriptionEndpoint option');
    });

    it('should reject an endpoint with query parameters', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('GET on endpoint returns RDF'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: `${endpoint}?query={}` }))
        .rejects.toThrow('must not contain query parameters');
    });

    it('should validate that the endpoint returns RDF', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('GET on endpoint returns RDF'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).resolves.toBeUndefined();
    });

    it('should reject an endpoint that does not return RDF', async() => {
      contentType = 'text/html';
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('GET on endpoint returns RDF'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('Could not retrieve an RDF service description');
    });

    it('should validate the matching sd:endpoint triple', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description contains a matching sd:endpoint triple'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).resolves.toBeUndefined();
    });

    it('should reject a non-matching sd:endpoint triple', async() => {
      serviceDescription = serviceDescription.replace(endpoint, 'http://example.org/other');
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description contains a matching sd:endpoint triple'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('does not contain a matching sd:endpoint triple');
    });

    it('should reject an sd:endpoint that is not an IRI', async() => {
      serviceDescription = serviceDescription.replace(`<${endpoint}>`, `"${endpoint}"`);
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description contains a matching sd:endpoint triple'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('does not contain a matching sd:endpoint triple');
    });

    it('should validate the service-description vocabulary', async() => {
      serviceDescription += `
[] a sd:Dataset ;
  sd:defaultGraph [] ;
  sd:namedGraph [ sd:name <http://example.org/graph> ] .`;
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).resolves.toBeUndefined();
    });

    it('should reject a named graph without an sd:name', async() => {
      serviceDescription += '\n[] sd:namedGraph [] .';
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('must have an sd:name');
    });

    it('should reject an sd:name that is not an IRI', async() => {
      serviceDescription += '\n[] sd:namedGraph [ sd:name "named graph" ] .';
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('sd:name value');
    });

    it('should fail schema validation if sd:endpoint is not an IRI', async() => {
      serviceDescription = serviceDescription.replace(`<${endpoint}>`, `"${endpoint}"`);
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('sd:endpoint value');
    });

    it('should reject an sd:NamedGraph without an sd:name', async() => {
      serviceDescription += '\n[] a sd:NamedGraph .';
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('must have an sd:name');
    });

    it('should reject a dataset without an sd:defaultGraph', async() => {
      serviceDescription += '\n[] a sd:Dataset .';
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Service description conforms to schema'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint })).rejects.toThrow('must have an sd:defaultGraph');
    });

    it('should reject an unknown test', async() => {
      const testCase = await handler.resourceToTestCase(<any> {}, testCaseData('Unknown service-description test'));
      await expect(testCase.test(<any> {}, { serviceDescriptionEndpoint: endpoint }))
        .rejects.toThrow('Unsupported SPARQL service-description test');
    });
  });
});
