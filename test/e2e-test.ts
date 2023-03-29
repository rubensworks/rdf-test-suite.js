import { TestSuiteRunner } from '../lib/TestSuiteRunner';
import { testCaseToMediaMappings } from '..'
import rdfParse from 'rdf-parse';
import * as path from 'path';
import * as fs from 'fs';

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

if (!fs.existsSync(path.join(__dirname, 'cache')))
  fs.mkdirSync(path.join(__dirname, 'cache'))

describe('e2e test on the test suite runner', () => {
  const runner = new TestSuiteRunner();

  for (const spec of parsingSpecs) {
    it(`it should correctly run [${spec}]`, async () => {
      const result = await runner.runManifest(spec, {
        parse(data, baseIRI, options, test) {
          return require('arrayify-stream').default(rdfParse.parse(require('streamify-string')(data), { 
            baseIRI,
            contentType: test.types && testCaseToMediaMappings[test.types.find(type => type in testCaseToMediaMappings)] 
          }));
        }
      }, {
        timeOutDuration: 20_000,
        exitWithStatusCode0: true,
        outputFormat: 'detailed',
        customEngingeOptions: {},
        cachePath: path.join(__dirname, 'cache') + '/'
      });

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(r => r.ok)).toEqual(true);
    }, 20_000);
  }
});
