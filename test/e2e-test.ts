import { ITestSuiteConfig, TestSuiteRunner } from '../lib/TestSuiteRunner';
import { testCaseToMediaMappings, QueryResultBindings, QueryResultBoolean, QueryResultQuads, ErrorSkipped } from '..';
import { QueryEngine } from '@comunica/query-sparql';
import { Store as N3Store } from 'n3';
import rdfParse from 'rdf-parse';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import * as path from 'path';
import * as fs from 'fs';

if (!fs.existsSync(path.join(__dirname, 'cache')))
  fs.mkdirSync(path.join(__dirname, 'cache'))

describe('e2e tests on the test suite runner', () => {
  const parsingSpecs = [
    "http://w3c.github.io/rdf-tests/ntriples/manifest.ttl",
    "http://w3c.github.io/rdf-tests/nquads/manifest.ttl",
    "http://w3c.github.io/rdf-tests/turtle/manifest.ttl",
    "http://w3c.github.io/rdf-tests/trig/manifest.ttl",
    "https://w3c.github.io/json-ld-api/tests/toRdf-manifest.jsonld",
    "https://w3c.github.io/json-ld-streaming/tests/stream-toRdf-manifest.jsonld",

    // TODO: Enable these when the next version of n3.js is released
    // "http://w3c.github.io/N3/tests/manifest.ttl",
    // "https://w3c.github.io/rdf-star/tests/trig/syntax/manifest.jsonld",
    // "https://w3c.github.io/rdf-star/tests/trig/eval/manifest.jsonld",
    // "https://w3c.github.io/rdf-star/tests/turtle/syntax/manifest.jsonld",
    // "https://w3c.github.io/rdf-star/tests/turtle/eval/manifest.jsonld",
    // "https://w3c.github.io/rdf-star/tests/nt/syntax/manifest.jsonld",
  ]

  let _console = globalThis.console;
  let runner: TestSuiteRunner;
  let config: ITestSuiteConfig;
  beforeEach(() => {
    // @ts-ignore
    globalThis.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
    runner = new TestSuiteRunner();
    config = {
      timeOutDuration: 120_000,
      exitWithStatusCode0: true,
      outputFormat: 'detailed',
      customEngingeOptions: {},
      cachePath: path.join(__dirname, 'cache') + '/'
    };
  });

  afterAll(() => {
    // Restore the console
    globalThis.console = _console;
  });

  describe('parsing', () => {
    for (const spec of parsingSpecs) {
      it(`it should correctly run [${spec}]`, async () => {


        const result = await runner.runManifest(spec, spec.includes('json-ld') ? jsonldParser : normalParser, {
          ...config,
          customEngingeOptions: {
            ...config.customEngingeOptions,
            streamingProfile: spec.includes('stream')
          }
        });

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
        expect(result.length).toBeGreaterThan(0);

        let skipped = 0;
        result.forEach(r => {
          if (r.skipped)
            skipped++;
        });

        if (spec.includes('json-ld')) {
          expect(skipped).toBeLessThanOrEqual(11);
          expect(skipped).toBeLessThan(result.length);
        } else {
          expect(skipped).toEqual(0);
        }

        // All tests should either be ok or skipped
        expect(result.every(r => r.ok || r.skipped)).toEqual(true);
      }, 130_000);
    }
  });

  describe('query', () => {
    for (const spec of [
      "http://www.w3.org/TR/sparql11-query/",
      "http://www.w3.org/TR/sparql11-update/",
      "http://www.w3.org/TR/sparql11-results-csv-tsv/",
      "http://www.w3.org/TR/sparql11-results-json/",
      // Federated spec tries to do external queries
      // "http://www.w3.org/TR/sparql11-federated-query/",
      "http://www.w3.org/TR/sparql11-service-description/",
      "http://www.w3.org/TR/sparql11-protocol/",
      "http://www.w3.org/TR/sparql11-http-rdf-update/",
    ]) {

      it(`should run correctly on [${spec}]`, async () => {
        config.specification = spec
        const result = await runner.runManifest('http://w3c.github.io/rdf-tests/sparql/sparql11/manifest-all.ttl', queryEngine(new QueryEngine()), config);

        // Run assertions
        expect(console.log).not.toHaveBeenCalled();
        // Warnings occur when the runner cannot handle a test
        expect(console.warn).not.toHaveBeenCalled();
        // One error for each of the tsv cases
        expect(console.error).toHaveBeenCalledTimes(6);

        expect(result.length).toBeGreaterThan(0)

        let skipped = 0;
        result.forEach(r => {
          if (r.skipped)
            skipped++;
        });

        // Unsupported test can be skipped
        if (!spec.includes('tsv') && !spec.includes('rdf-update') && !spec.includes('service-description') && !spec.includes('protocol'))
          expect(skipped).toEqual(0);

        expect(result.every(r => r.ok || r.skipped)).toEqual(true);

      }, 130_000);
    }

  });
});

function queryEngine(engine) {
  return {
    parse: function (query, options) {
      return engine.actorInitQuery.mediatorQueryParse.mediate({ query: query, baseIRI: options.baseIRI });
    },
    query: function (data, queryString, options) {
      return this.queryLdf([{ type: 'rdfjsSource', value: source(data) }], null, queryString, options);
    },
    queryLdf: async function (sources, proxyUrl, queryString, options) {
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources,
        httpProxyHandler: proxyUrl ? new ProxyHandlerStatic(proxyUrl) : null,
        httpRetryOnServerError: true,
        httpRetryCount: 3,
        httpRetryDelay: 10,
      });
      if (result.resultType === 'boolean') {
        return new QueryResultBoolean(await result.execute());
      } else if (result.resultType === 'quads') {
        return new QueryResultQuads(await require('arrayify-stream').default(await result.execute()));
      } else if (result.resultType === 'bindings') {
        return new QueryResultBindings(
          (await result.metadata()).variables.map(variable => `?${variable.value}`),
          (await require('arrayify-stream').default(await result.execute()))
            .map((binding) => Object.fromEntries([...binding]
              .map(([key, value]) => [`?${key.value}`, value]))), false
        );
      } else {
        throw new Error('Invalid query result type: ' + result.resultType);
      }
    },
    update: async function (data, queryString, options) {
      const store = await source(data);
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        source: { type: 'rdfjsSource', value: store },
        destination: store,
      });
      await result.execute();
      return [...store];
    },
  };
};

function source(data) {
  const store = new N3Store();
  store.addQuads(data);
  return store;
}

const normalParser = {
  parse(data, baseIRI, _, test) {
    return require('arrayify-stream').default(rdfParse.parse(require('streamify-string')(data), {
      baseIRI,
      contentType: test.types && testCaseToMediaMappings[test.types.find(type => type in testCaseToMediaMappings)]
    }));
  }
}

const jsonldParser = {
  parse: function (data, baseIRI, options, test) {
    if (options.processingMode && (options.processingMode !== '1.0' && options.processingMode !== '1.1')) {
      return Promise.reject(
        new ErrorSkipped(`Test with processing mode ${options.processingMode} was skipped, only 1.0 is supported.`));
    }
    if (options.specVersion && options.specVersion !== '1.1' && options.specVersion !== 'star') {
      return Promise.reject(
        new ErrorSkipped(`Test with spec version ${options.specVersion} was skipped, only 1.1 is supported.`));
    }
    return require('arrayify-stream').default(require('streamify-string')(data)
      .pipe(new JsonLdParser(Object.assign({
        baseIRI,
        validateValueIndexes: true,
        normalizeLanguageTags: true, // To simplify testing
      }, options))));
  },
}
