import { ContextParser } from 'jsonld-context-parser';
import { DataFactory } from 'rdf-data-factory';
import { Resource } from 'rdf-object';
import { ErrorTest } from '../../../lib/ErrorTest';
import { TestCaseCsvResultFormat, TestCaseCsvResultFormatHandler } from '../../../lib/testcase/sparql/TestCaseCsvResultFormat';

const streamifyString = require('streamify-string');

const DF = new DataFactory();

// Mock fetch
(<any> globalThis).fetch = (url: string) => {
  let body;
  switch (url) {
    case 'QUERY.rq':
      body = streamifyString(`SELECT * WHERE { ?s ?p ?o }`);
      break;
    case 'RESULT.csv':
      body = streamifyString(`x,y\n1,2\n3,4`);
      break;
    default:
      return Promise.reject(new Error(`Fetch error for ${url}`));
  }
  return Promise.resolve(new Response(body, <any> { status: 200 }));
};

describe('TestCaseCsvResultFormat', () => {
  describe('TestCaseCsvResultFormatHandler', () => {
    const handler = new TestCaseCsvResultFormatHandler();
    let context: any;
    let pAction: Resource;
    let pResult: Resource;
    let pQuery: Resource;

    beforeEach(async() => {
      context = await new ContextParser().parse(require('../../../lib/context-manifest.json'));
      pAction = new Resource({ term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#action'), context });
      pResult = new Resource({ term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result'), context });
      pQuery = new Resource({ term: DF.namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-query#query'), context });
    });

    describe('#resourceToTestCase', () => {
      it('should produce a TestCaseCsvResultFormat', async() => {
        const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
        const action = new Resource({ term: DF.namedNode('action1'), context });

        action.addProperty(pQuery, new Resource({ term: DF.literal('QUERY.rq'), context }));
        resource.addProperty(pAction, action);
        resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.csv'), context }));

        const testCase = await handler.resourceToTestCase(resource, <any> { name: 'Test1' });

        expect(testCase).toBeInstanceOf(TestCaseCsvResultFormat);
        expect(testCase.type).toBe('sparql');
        expect(testCase.name).toBe('Test1');
        expect(testCase.queryString).toBe('SELECT * WHERE { ?s ?p ?o }');
        expect(testCase.expectedResult).toBe('x,y\n1,2\n3,4');
      });

      it('should error on a resource without action', async() => {
        const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
        resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.csv'), context }));

        await expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
      });

      it('should error on a resource without result', async() => {
        const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
        const action = new Resource({ term: DF.namedNode('action1'), context });
        action.addProperty(pQuery, new Resource({ term: DF.literal('QUERY.rq'), context }));
        resource.addProperty(pAction, action);

        await expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
      });

      it('should error on a resource without query in action', async() => {
        const resource = new Resource({ term: DF.namedNode('http://ex.org/test'), context });
        const action = new Resource({ term: DF.namedNode('action1'), context });
        resource.addProperty(pAction, action);
        resource.addProperty(pResult, new Resource({ term: DF.literal('RESULT.csv'), context }));

        await expect(handler.resourceToTestCase(resource, <any> {})).rejects.toBeTruthy();
      });
    });
  });

  describe('Static Methods', () => {
    describe('#parseCsv', () => {
      it('should parse valid CSV strings', () => {
        const parsed = TestCaseCsvResultFormat.parseCsv(`a,b\n1,2\n3,4`);
        expect(parsed.variables).toEqual([ 'a', 'b' ]);
        expect(parsed.rows).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
      });

      it('should throw on missing headers', () => {
        expect(() => TestCaseCsvResultFormat.parseCsv(`\n\n`))
          .toThrow('Invalid CSV result: Missing header row.');
      });
    });

    describe('#csvResultsEqual', () => {
      it('should return true for identical CSVs', () => {
        const expected = `a,b\n1,2\n3,4`;
        const actual = `a,b\n1,2\n3,4`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(true);
      });

      it('should return true for unordered rows', () => {
        const expected = `a,b\n1,2\n3,4`;
        const actual = `a,b\n3,4\n1,2`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(true);
      });

      it('should return true for isomorphic blank nodes', () => {
        const expected = `x,y\n_:b0,_:b1\n_:b2,_:b3`;
        const actual = `x,y\n_:a,_:b\n_:c,_:d`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(true);
      });

      it('should return false for non-isomorphic blank nodes', () => {
        const expected = `x,y\n_:b0,_:b1\n_:b2,_:b3`;
        const actual = `x,y\n_:a,_:b\n_:c,_:c`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return false for different variables', () => {
        const expected = `a,b\n1,2`;
        const actual = `a,c\n1,2`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return false for different row counts', () => {
        const expected = `a,b\n1,2\n3,4`;
        const actual = `a,b\n1,2`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return false for completely different results', () => {
        const expected = `a,b\n1,2`;
        const actual = `a,b\n9,9`;
        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return false when expected value is a blank node but actual value is a standard literal', () => {
        const expected = `a,b\n_:b1,foo`;
        const actual = `a,b\nnot_a_bnode,foo`;

        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return false when a blank node maps to a different actual blank node in a subsequent row', () => {
        const expected = `a,b\n_:b1,foo\n_:b1,bar`;
        const actual = `a,b\n_:a1,foo\n_:a2,bar`;

        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(false);
      });

      it('should return true when a blank node consistently maps to the same actual blank node across multiple rows', () => {
        const expected = `a,b\n_:b1,foo\n_:b1,bar`;
        const actual = `a,b\n_:a1,foo\n_:a1,bar`;

        expect(TestCaseCsvResultFormat.csvResultsEqual(expected, actual)).toBe(true);
      });

      it('should throw on PapaParse errors', () => {
        const badCsv = `a,b\n1,2,3`;

        expect(() => TestCaseCsvResultFormat.parseCsv(badCsv))
          .toThrow(/Invalid CSV result \(Row 0\):/u);
      });

      it('should gracefully return false on un-parseable CSVs', () => {
        expect(TestCaseCsvResultFormat.csvResultsEqual(`a,b\n1,2`, `\n\n`)).toBe(false);
      });
    });
  });

  describe('#test', () => {
    let testCase: TestCaseCsvResultFormat;

    beforeEach(() => {
      testCase = new TestCaseCsvResultFormat(
        <any> { uri: 'http://test.com', baseIRI: 'http://base.org' },
        {
          baseIRI: 'http://base.org',
          queryString: 'SELECT * { ?s ?p ?o }',
          queryData: [],
          expectedResult: `a,b\n1,2\n3,4`,
          resultSource: <any> { url: 'http://result.csv' },
          queryDataLinks: [],
        },
      );
    });

    it('should throw an ErrorTest if queryResultFormat is missing on the engine', async() => {
      const engine: any = {};
      await expect(testCase.test(engine, {})).rejects.toThrow(ErrorTest);
      await expect(testCase.test(engine, {})).rejects.toThrow('CSV result format tests require queryResultFormat to be implemented by the query engine.');
    });

    it('should resolve successfully when the actual result matches the expected result', async() => {
      const engine: any = {
        queryResultFormat: async() => streamifyString(`a,b\n1,2\n3,4`),
      };
      await expect(testCase.test(engine, {})).resolves.toBeUndefined();
    });

    it('should throw an ErrorTest when the actual result differs from the expected result', async() => {
      const engine: any = {
        queryResultFormat: async() => streamifyString(`a,b\n9,9`),
      };
      await expect(testCase.test(engine, {})).rejects.toThrow(ErrorTest);
      await expect(testCase.test(engine, {})).rejects.toThrow(/Invalid CSV result format/u);
    });
  });
});
