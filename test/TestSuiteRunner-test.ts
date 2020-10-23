import {ErrorTest} from "../lib/ErrorTest";

const mockTest1 = {
  name: 'Test1',
  test: () => Promise.resolve(1),
  uri: 'http://ex.org/test1',
};
const mockTest2 = {
  comment: 'Test2 comment',
  name: 'Test2',
  test: () => Promise.resolve(2),
  uri: 'http://ex.org/test2',
};
const mockTest3 = {
  name: 'Test3',
  test: () => Promise.reject(new ErrorTest('Fail')),
  uri: 'http://ex.org/test3',
};

const timeOutMockTest1 = {
  name: 'Timeout1',
  test: () => {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), 500));
  },
  uri: 'http://ex.org/timeout1',
};

const defaultConfig: ITestSuiteConfig = {
  customEngingeOptions:  {},
  exitWithStatusCode0: false,
  outputFormat: 'detailed',
  timeOutDuration: 3000,
};

// Mock ManifestLoader
jest.mock('../lib/ManifestLoader', () => ({
  ManifestLoader: function ManifestLoader() {
    return {
      from: (manifestUrl: string, cachePath: string) => {
        if (manifestUrl === 'valid') {
          return Promise.resolve({
            testEntries: [
              mockTest1,
              mockTest2,
              mockTest3,
            ],
            uri: manifestUrl,
          });
        } else if (manifestUrl === 'validsub') {
          return Promise.resolve({
            subManifests: [
              {
                testEntries: [
                  mockTest1,
                ],
                uri: manifestUrl,
              },
              {
                testEntries: [
                  mockTest2,
                  mockTest3,
                ],
                uri: manifestUrl,
              },
            ],
            uri: manifestUrl,
          });
        } else if (manifestUrl === 'validspec') {
          return Promise.resolve({
            specifications: {
              spec1: {
                testEntries: [
                  mockTest1,
                  mockTest2,
                  mockTest3,
                ],
                uri: manifestUrl,
              },
            },
            uri: manifestUrl,
          });
        } else if (manifestUrl === 'timeout') {
          return Promise.resolve({
            testEntries: [timeOutMockTest1],
            uri: manifestUrl,
          });
        } else {
          return Promise.resolve({
            uri: manifestUrl,
          });
        }
      },
    };
  },
}));

// Mock time measurements
(<any> process).hrtime = () => {
  return [1, 1];
};

import "jest-rdf";
import * as LogSymbols from "log-symbols";
import {PassThrough} from "stream";
import {ITestSuiteConfig, TestSuiteRunner} from "../lib/TestSuiteRunner";

// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('TestSuiteRunner', () => {

  let runner;
  let handler;

  beforeEach(() => {
    runner = new TestSuiteRunner();
    handler = () => true;
  });

  describe('fromUrlToMappingString', () => {
    it('should be empty for a falsy string', () => {
      return expect(runner.fromUrlToMappingString(null)).toEqual([]);
    });

    it('should parse a valid string', () => {
      return expect(runner.fromUrlToMappingString(
        'https://w3c.github.io/json-ld-api/~/my/path/to/file/')).toEqual([
          { url: 'https://w3c.github.io/json-ld-api/', path: '/my/path/to/file/' },
        ]);
    });
  });

  describe('runManifest', () => {
    it('should produce an empty array for an empty manifest', () => {
      return expect(runner.runManifest('empty', handler, defaultConfig)).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest', () => {
      return expect(runner.runManifest('valid', handler, defaultConfig)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
          duration: 1000.000001,
        },
        {
          ok: true,
          test: mockTest2,
          duration: 1000.000001,
        },
        {
          error: new Error('Fail'),
          ok: false,
          test: mockTest3,
        },
      ]);
    });

    it('should produce results for a valid manifest with submanifests', () => {
      return expect(runner.runManifest('validsub', handler, defaultConfig)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
          duration: 1000.000001,
        },
        {
          ok: true,
          test: mockTest2,
          duration: 1000.000001,
        },
        {
          error: new Error('Fail'),
          ok: false,
          test: mockTest3,
        },
      ]);
    });

    it('should produce empty results for a valid manifest without the requested specifications', () => {
      const config: ITestSuiteConfig = { ...defaultConfig, specification: 'spec1' };
      return expect(runner.runManifest('valid', handler, config)).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest with the requested specifications', () => {
      const config: ITestSuiteConfig = { ...defaultConfig, specification: 'spec1' };
      return expect(runner.runManifest('validspec', handler, config)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
          duration: 1000.000001,
        },
        {
          ok: true,
          test: mockTest2,
          duration: 1000.000001,
        },
        {
          error: new Error('Fail'),
          ok: false,
          test: mockTest3,
        },
      ]);
    });

    it('should handle testcases that time out', (next) => {
      const config: ITestSuiteConfig = { ...defaultConfig, timeOutDuration: 200 };
      runner.runManifest('timeout', handler, config)
        .then((results) => {
          expect(results).toEqual([{
            error: new Error("Test case 'http://ex.org/timeout1' timed out"),
            ok: false,
            skipped: undefined,
            test: timeOutMockTest1,
          }]);
          next();
        })
        .catch((err) => {
          next.fail(err);
          next();
        });
    });

    it('should produce results for a valid manifest with a non-matching regex', () => {
      const config: ITestSuiteConfig = { ...defaultConfig, testRegex: /abc/ };
      return expect(runner.runManifest('valid', handler, config)).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest with a single-matching regex', () => {
      const config: ITestSuiteConfig = { ...defaultConfig, testRegex: /1/ };
      return expect(runner.runManifest('valid', handler, config)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
          duration: 1000.000001,
        },
      ]);
    });

    it('should produce results for a valid manifest with a multiple-matching regex', () => {
      const config: ITestSuiteConfig = { ...defaultConfig, testRegex: /^.*test.*$/ };
      return expect(runner.runManifest('valid', handler, config)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
          duration: 1000.000001,
        },
        {
          ok: true,
          test: mockTest2,
          duration: 1000.000001,
        },
        {
          error: new Error('Fail'),
          ok: false,
          test: mockTest3,
        },
      ]);
    });
  });

  describe('resultsToText', () => {

    const testResults = [
      {
        ok: true,
        test: mockTest1,
      },
      {
        ok: true,
        test: mockTest2,
      },
      {
        error: new ErrorTest('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];
    const testResultsSkips = [
      {
        ok: true,
        test: mockTest1,
      },
      {
        ok: false,
        skipped: true,
        test: mockTest2,
      },
      {
        ok: false,
        skipped: true,
        test: mockTest3,
      },
      {
        error: new ErrorTest('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];

    const testResultsExternal = [
      {
        ok: true,
        test: mockTest1,
      },
      {
        ok: false,
        skipped: true,
        test: mockTest2,
      },
      {
        ok: false,
        skipped: true,
        test: mockTest3,
      },
      {
        error: new Error('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];
    testResultsExternal[3].error.stack = "MYSTACK";

    it('should print an empty array of results', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, [], false);
      stdout.end();
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} 0 / 0 tests succeeded!
`);
    });

    it('should print an empty array of results compactly', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, [], true);
      stdout.end();
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} 0 / 0 tests succeeded!
`);
    });

    it('should print a non-empty array of results', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, testResults, false);
      stdout.end();
      // tslint:disable:no-trailing-whitespace
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} Test1 (http://ex.org/test1)
${LogSymbols.success} Test2 (http://ex.org/test2)
${LogSymbols.error} Test3 (http://ex.org/test3)

${LogSymbols.error} Test3
  
  Error: Fail
  More info: http://ex.org/test3

${LogSymbols.error} 2 / 3 tests succeeded!
`);
    });

    it('should print a non-empty array of results with skips', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, testResultsSkips, false);
      stdout.end();
      // tslint:disable:no-trailing-whitespace
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} Test1 (http://ex.org/test1)
${LogSymbols.info} Test2 (http://ex.org/test2)
${LogSymbols.info} Test3 (http://ex.org/test3)
${LogSymbols.error} Test3 (http://ex.org/test3)

${LogSymbols.error} Test3
  
  Error: Fail
  More info: http://ex.org/test3

${LogSymbols.error} 3 / 4 tests succeeded! (skipped 2)
`);
    });

    it('should print a non-empty array of results with external errors', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, testResultsExternal, false);
      stdout.end();
      // tslint:disable:no-trailing-whitespace
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} Test1 (http://ex.org/test1)
${LogSymbols.info} Test2 (http://ex.org/test2)
${LogSymbols.info} Test3 (http://ex.org/test3)
${LogSymbols.error} Test3 (http://ex.org/test3)

${LogSymbols.error} Test3
  
  MYSTACK
  More info: http://ex.org/test3

${LogSymbols.error} 3 / 4 tests succeeded! (skipped 2)
`);
    });

    it('should print a non-empty array of results compactly', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, testResults, true);
      stdout.end();
      // tslint:disable:no-trailing-whitespace
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} Test1 (http://ex.org/test1)
${LogSymbols.success} Test2 (http://ex.org/test2)
${LogSymbols.error} Test3 (http://ex.org/test3)
${LogSymbols.error} 2 / 3 tests succeeded!
`);
    });

    it('should print a non-empty array of results with skips compactly', async () => {
      const stdout = new PassThrough();
      runner.resultsToText(stdout, testResultsSkips, true);
      stdout.end();
      // tslint:disable:no-trailing-whitespace
      return expect(await stringifyStream(stdout)).toEqual(`${LogSymbols.success} Test1 (http://ex.org/test1)
${LogSymbols.info} Test2 (http://ex.org/test2)
${LogSymbols.info} Test3 (http://ex.org/test3)
${LogSymbols.error} Test3 (http://ex.org/test3)
${LogSymbols.error} 3 / 4 tests succeeded! (skipped 2)
`);
    });
  });

  describe('resultsToEarl', () => {
    const testResults = [
      {
        ok: true,
        test: mockTest1,
      },
      {
        ok: true,
        test: mockTest2,
      },
      {
        error: new Error('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];
    const testResultsSkips = [
      {
        ok: true,
        test: mockTest1,
      },
      {
        ok: false,
        skipped: true,
        test: mockTest2,
      },
      {
        error: new Error('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];
    const propertiesAll = {
      reportUri: 'http://ex.org/report',
      authors: [
        {
          uri: 'http://ex.org/myFoaf',
          name: 'My Author Name',
          homepage: 'http://ex.org/MyPersonalHomePage',
          primaryTopic: 'http://ex.org/MyPrimaryTopic',
        },
      ],
      licenseUri: 'http://ex.org/myLicense',
      applicationUri: 'http://ex.org/myApp',
      applicationHomepageUrl: 'http://ex.org/myHomePage',
      applicationBugsUrl: 'http://ex.org/myBugs',
      applicationBlogUrl: 'http://ex.org/myBlog',
      applicationNameFull: 'My Name',
      applicationNameNpm: 'MyName',
      applicationDescription: 'My Description',
      specificationUris: [
        'http://ex.org/TheSpec',
      ],
      version: '1.2.3',
    };
    const propertiesAllNoPTopic = {
      reportUri: 'http://ex.org/report',
      authors: [
        {
          uri: 'http://ex.org/myFoaf',
          name: 'My Author Name',
          homepage: 'http://ex.org/MyPersonalHomePage',
        },
      ],
      licenseUri: 'http://ex.org/myLicense',
      applicationUri: 'http://ex.org/myApp',
      applicationHomepageUrl: 'http://ex.org/myHomePage',
      applicationBugsUrl: 'http://ex.org/myBugs',
      applicationBlogUrl: 'http://ex.org/myBlog',
      applicationNameFull: 'My Name',
      applicationNameNpm: 'MyName',
      applicationDescription: 'My Description',
      specificationUris: [
        'http://ex.org/TheSpec',
      ],
      version: '1.2.3',
    };
    const propertiesMinimal = {
      reportUri: '',
      authors: [],
      licenseUri: 'http://ex.org/myLicense',
      applicationUri: 'http://ex.org/myApp',
      applicationHomepageUrl: 'http://ex.org/myHomePage',
      applicationNameFull: 'My Name',
      applicationNameNpm: 'MyName',
      applicationDescription: 'My Description',
      specificationUris: [
        'http://ex.org/TheSpec',
      ],
    };
    const propertiesMinimalAuthor = {
      reportUri: '',
      authors: [
        {
          uri: 'http://ex.org/myFoaf',
        },
      ],
      licenseUri: 'http://ex.org/myLicense',
      applicationUri: 'http://ex.org/myApp',
      applicationHomepageUrl: 'http://ex.org/myHomePage',
      applicationNameFull: 'My Name',
      applicationNameNpm: 'MyName',
      applicationDescription: 'My Description',
      specificationUris: [
        'http://ex.org/TheSpec',
      ],
    };
    const testDate = new Date();

    it('without tests should produce triples for all requires properties', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl([], propertiesAll, testDate))).toBeRdfIsomorphic([
        quad('http://ex.org/report', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
        quad('http://ex.org/report', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
        quad('http://ex.org/report', p.foaf + 'maker', 'http://ex.org/myFoaf'),

        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
        quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
        quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
        quad('http://ex.org/myApp', p.doap + 'release', '_:b_release'),
        quad('_:b_release',         p.doap + 'revision', '"1.2.3"'),
        quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
        quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
        quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
        quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
        quad('http://ex.org/myApp', p.doap + 'category', 'http://dbpedia.org/resource/Resource_Description_Framework'),
        quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
        quad('http://ex.org/myApp', p.doap + 'bug-database', 'http://ex.org/myBugs'),
        quad('http://ex.org/myApp', p.doap + 'blog', 'http://ex.org/myBlog'),
        quad('http://ex.org/myApp', p.doap + 'developer', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'maintainer', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'documenter', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'maker', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.dc   + 'creator', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
        quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

        quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://xmlns.com/foaf/0.1/Person'),
        quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertor'),
        quad('http://ex.org/myFoaf', p.foaf + 'name', '"My Author Name"'),
        quad('http://ex.org/myFoaf', p.foaf + 'homepage', 'http://ex.org/MyPersonalHomePage'),
        quad('http://ex.org/myFoaf', p.foaf + 'primaryTopicOf', 'http://ex.org/MyPrimaryTopic'),
      ]);
    });

    it('without tests should produce triples for all requires properties without primary topic', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl([], propertiesAllNoPTopic, testDate))).toBeRdfIsomorphic([
        quad('http://ex.org/report', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
        quad('http://ex.org/report', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
        quad('http://ex.org/report', p.foaf + 'maker', 'http://ex.org/myFoaf'),

        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
        quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
        quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
        quad('http://ex.org/myApp', p.doap + 'release', '_:b_release'),
        quad('_:b_release',         p.doap + 'revision', '"1.2.3"'),
        quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
        quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
        quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
        quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
        quad('http://ex.org/myApp', p.doap + 'category', 'http://dbpedia.org/resource/Resource_Description_Framework'),
        quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
        quad('http://ex.org/myApp', p.doap + 'bug-database', 'http://ex.org/myBugs'),
        quad('http://ex.org/myApp', p.doap + 'blog', 'http://ex.org/myBlog'),
        quad('http://ex.org/myApp', p.doap + 'developer', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'maintainer', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'documenter', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.doap + 'maker', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.dc   + 'creator', 'http://ex.org/myFoaf'),
        quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
        quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

        quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://xmlns.com/foaf/0.1/Person'),
        quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertor'),
        quad('http://ex.org/myFoaf', p.foaf + 'name', '"My Author Name"'),
        quad('http://ex.org/myFoaf', p.foaf + 'homepage', 'http://ex.org/MyPersonalHomePage'),
      ]);
    });

    it('without tests should produce triples without requires properties', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl([], propertiesMinimal, testDate))).toBeRdfIsomorphic([
        quad('', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
        quad('', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
        quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
        quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
        quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
        quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
        quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
        quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
        quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
        quad('http://ex.org/myApp', p.doap + 'category', 'http://dbpedia.org/resource/Resource_Description_Framework'),
        quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
        quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
        quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),
      ]);
    });

    it('without tests should produce triples without requires author properties', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl([], propertiesMinimalAuthor, testDate)))
        .toBeRdfIsomorphic([
          quad('', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
          quad('', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
          quad('', p.foaf + 'maker', 'http://ex.org/myFoaf'),

          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
          quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
          quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
          quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
          quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
          quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
          quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
          quad('http://ex.org/myApp', p.doap + 'category',
            'http://dbpedia.org/resource/Resource_Description_Framework'),
          quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
          quad('http://ex.org/myApp', p.doap + 'developer', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'maintainer', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'documenter', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'maker', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.dc   + 'creator', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
          quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

          quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://xmlns.com/foaf/0.1/Person'),
          quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertor'),
        ]);
    });

    it('with tests should produce triples for all requires properties', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl(testResults, propertiesAll, testDate)))
        .toBeRdfIsomorphic([
          quad('http://ex.org/report', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
          quad('http://ex.org/report', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
          quad('http://ex.org/report', p.foaf + 'maker', 'http://ex.org/myFoaf'),

          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
          quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
          quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
          quad('http://ex.org/myApp', p.doap + 'release', '_:b_release'),
          quad('_:b_release',         p.doap + 'revision', '"1.2.3"'),
          quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
          quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
          quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
          quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
          quad('http://ex.org/myApp', p.doap + 'category',
            'http://dbpedia.org/resource/Resource_Description_Framework'),
          quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
          quad('http://ex.org/myApp', p.doap + 'bug-database', 'http://ex.org/myBugs'),
          quad('http://ex.org/myApp', p.doap + 'blog', 'http://ex.org/myBlog'),
          quad('http://ex.org/myApp', p.doap + 'developer', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'maintainer', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'documenter', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.doap + 'maker', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.dc   + 'creator', 'http://ex.org/myFoaf'),
          quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
          quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

          quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://xmlns.com/foaf/0.1/Person'),
          quad('http://ex.org/myFoaf', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertor'),
          quad('http://ex.org/myFoaf', p.foaf + 'name', '"My Author Name"'),
          quad('http://ex.org/myFoaf', p.foaf + 'homepage', 'http://ex.org/MyPersonalHomePage'),
          quad('http://ex.org/myFoaf', p.foaf + 'primaryTopicOf', 'http://ex.org/MyPrimaryTopic'),

          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test1', p.dc   + 'title', '"Test1"'),
          quad('http://ex.org/test1', p.earl + 'assertions', '_:assertions0'),
          quad('_:assertions0', p.rdf + 'first', '_:assertion0'),
          quad('_:assertions0', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion0', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion0', p.earl + 'assertedBy', 'http://ex.org/myFoaf'),
          quad('_:assertion0', p.earl + 'test', 'http://ex.org/test1'),
          quad('_:assertion0', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion0', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion0', p.earl + 'result', '_:result0'),
          quad('_:result0', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result0', p.earl + 'outcome', p.earl + 'passed'),
          quad('_:result0', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test2', p.dc   + 'title', '"Test2"'),
          quad('http://ex.org/test2', p.dc   + 'description', '"Test2 comment"'),
          quad('http://ex.org/test2', p.earl + 'assertions', '_:assertions1'),
          quad('_:assertions1', p.rdf + 'first', '_:assertion1'),
          quad('_:assertions1', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion1', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion1', p.earl + 'assertedBy', 'http://ex.org/myFoaf'),
          quad('_:assertion1', p.earl + 'test', 'http://ex.org/test2'),
          quad('_:assertion1', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion1', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion1', p.earl + 'result', '_:result1'),
          quad('_:result1', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result1', p.earl + 'outcome', p.earl + 'passed'),
          quad('_:result1', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test3', p.dc   + 'title', '"Test3"'),
          quad('http://ex.org/test3', p.earl + 'assertions', '_:assertions2'),
          quad('_:assertions2', p.rdf + 'first', '_:assertion2'),
          quad('_:assertions2', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion2', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion2', p.earl + 'assertedBy', 'http://ex.org/myFoaf'),
          quad('_:assertion2', p.earl + 'test', 'http://ex.org/test3'),
          quad('_:assertion2', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion2', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion2', p.earl + 'result', '_:result2'),
          quad('_:result2', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result2', p.earl + 'outcome', p.earl + 'failed'),
          quad('_:result2', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
        ]);
    });

    it('with tests should produce triples without requires properties', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl(testResults, propertiesMinimal, testDate)))
        .toBeRdfIsomorphic([
          quad('', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
          quad('', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
          quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
          quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
          quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
          quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
          quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
          quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
          quad('http://ex.org/myApp', p.doap + 'category',
            'http://dbpedia.org/resource/Resource_Description_Framework'),
          quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
          quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
          quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test1', p.dc   + 'title', '"Test1"'),
          quad('http://ex.org/test1', p.earl + 'assertions', '_:assertions0'),
          quad('_:assertions0', p.rdf + 'first', '_:assertion0'),
          quad('_:assertions0', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion0', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion0', p.earl + 'test', 'http://ex.org/test1'),
          quad('_:assertion0', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion0', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion0', p.earl + 'result', '_:result0'),
          quad('_:result0', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result0', p.earl + 'outcome', p.earl + 'passed'),
          quad('_:result0', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test2', p.dc   + 'title', '"Test2"'),
          quad('http://ex.org/test2', p.dc   + 'description', '"Test2 comment"'),
          quad('http://ex.org/test2', p.earl + 'assertions', '_:assertions1'),
          quad('_:assertions1', p.rdf + 'first', '_:assertion1'),
          quad('_:assertions1', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion1', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion1', p.earl + 'test', 'http://ex.org/test2'),
          quad('_:assertion1', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion1', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion1', p.earl + 'result', '_:result1'),
          quad('_:result1', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result1', p.earl + 'outcome', p.earl + 'passed'),
          quad('_:result1', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test3', p.dc   + 'title', '"Test3"'),
          quad('http://ex.org/test3', p.earl + 'assertions', '_:assertions2'),
          quad('_:assertions2', p.rdf + 'first', '_:assertion2'),
          quad('_:assertions2', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion2', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion2', p.earl + 'test', 'http://ex.org/test3'),
          quad('_:assertion2', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion2', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion2', p.earl + 'result', '_:result2'),
          quad('_:result2', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result2', p.earl + 'outcome', p.earl + 'failed'),
          quad('_:result2', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
        ]);
    });

    it('with tests should produce triples without requires properties, with skipped tests', async () => {
      const p = require('../lib/prefixes.json');
      return expect(await arrayifyStream(runner.resultsToEarl(testResultsSkips, propertiesMinimal, testDate)))
        .toBeRdfIsomorphic([
          quad('', p.foaf + 'primaryTopic', 'http://ex.org/myApp'),
          quad('', p.dc + 'issued', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'Software'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.earl + 'TestSubject'),
          quad('http://ex.org/myApp', p.rdf  + 'type', p.doap + 'Project'),
          quad('http://ex.org/myApp', p.doap + 'name', '"My Name"'),
          quad('http://ex.org/myApp', p.dc   + 'title', '"My Name"'),
          quad('http://ex.org/myApp', p.doap + 'homepage', 'http://ex.org/myHomePage'),
          quad('http://ex.org/myApp', p.doap + 'license', 'http://ex.org/myLicense'),
          quad('http://ex.org/myApp', p.doap + 'programming-language', '"JavaScript"'),
          quad('http://ex.org/myApp', p.doap + 'implements', 'http://ex.org/TheSpec'),
          quad('http://ex.org/myApp', p.doap + 'category',
            'http://dbpedia.org/resource/Resource_Description_Framework'),
          quad('http://ex.org/myApp', p.doap + 'download-page', 'https://npmjs.org/package/MyName'),
          quad('http://ex.org/myApp', p.dc   + 'description', '"My Description"@en'),
          quad('http://ex.org/myApp', p.doap + 'description', '"My Description"@en'),

          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test1', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test1', p.dc   + 'title', '"Test1"'),
          quad('http://ex.org/test1', p.earl + 'assertions', '_:assertions0'),
          quad('_:assertions0', p.rdf + 'first', '_:assertion0'),
          quad('_:assertions0', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion0', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion0', p.earl + 'test', 'http://ex.org/test1'),
          quad('_:assertion0', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion0', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion0', p.earl + 'result', '_:result0'),
          quad('_:result0', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result0', p.earl + 'outcome', p.earl + 'passed'),
          quad('_:result0', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test2', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test2', p.dc   + 'title', '"Test2"'),
          quad('http://ex.org/test2', p.dc   + 'description', '"Test2 comment"'),
          quad('http://ex.org/test2', p.earl + 'assertions', '_:assertions1'),
          quad('_:assertions1', p.rdf + 'first', '_:assertion1'),
          quad('_:assertions1', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion1', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion1', p.earl + 'test', 'http://ex.org/test2'),
          quad('_:assertion1', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion1', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion1', p.earl + 'result', '_:result1'),
          quad('_:result1', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result1', p.earl + 'outcome', p.earl + 'inapplicable'),
          quad('_:result1', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),

          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCriterion'),
          quad('http://ex.org/test3', p.rdf  + 'type', p.earl + 'TestCase'),
          quad('http://ex.org/test3', p.dc   + 'title', '"Test3"'),
          quad('http://ex.org/test3', p.earl + 'assertions', '_:assertions2'),
          quad('_:assertions2', p.rdf + 'first', '_:assertion2'),
          quad('_:assertions2', p.rdf + 'rest', p.rdf + 'nil'),
          quad('_:assertion2', p.rdf  + 'type', 'http://www.w3.org/ns/earl#Assertion'),
          quad('_:assertion2', p.earl + 'test', 'http://ex.org/test3'),
          quad('_:assertion2', p.earl + 'subject', 'http://ex.org/myApp'),
          quad('_:assertion2', p.earl + 'mode', p.earl + 'automatic'),
          quad('_:assertion2', p.earl + 'result', '_:result2'),
          quad('_:result2', p.rdf + 'type', p.earl + 'TestResult'),
          quad('_:result2', p.earl + 'outcome', p.earl + 'failed'),
          quad('_:result2', p.dc + 'date', '"' + testDate.toISOString() + '"^^' + p.xsd + 'dateTime'),
        ]);
    });
  });

  describe('packageJsonToEarlProperties', () => {
    it('should work with an empty package.json file', () => {
      return expect(runner.packageJsonToEarlProperties({})).toEqual({
        applicationBugsUrl: undefined,
        applicationDescription: undefined,
        applicationHomepageUrl: undefined,
        applicationNameFull: undefined,
        applicationNameNpm: undefined,
        applicationUri: null,
        authors: [
          {
            homepage: null,
            name: undefined,
            uri: 'https://www.npmjs.com/package/undefined/#author',
          },
        ],
        licenseUri: null,
        reportUri: null,
        specificationUris: [],
      });
    });

    it('should work with a filled package.json file', () => {
      return expect(runner.packageJsonToEarlProperties({
        bugs: 'BUGS',
        description: 'DESC',
        homepage: 'HOME',
        name: 'NAME',
        author: 'AUTHOR',
        license: 'LICENSE',
        version: '1.2.3',
      })).toEqual({
        applicationBugsUrl: 'BUGS',
        applicationDescription: 'DESC',
        applicationHomepageUrl: 'HOME',
        applicationNameFull: 'NAME',
        applicationNameNpm: 'NAME',
        applicationUri: 'https://www.npmjs.com/package/NAME/',
        authors: [
          {
            homepage: null,
            name: 'AUTHOR',
            uri: 'https://www.npmjs.com/package/NAME/#author',
          },
        ],
        licenseUri: 'http://opensource.org/licenses/LICENSE',
        reportUri: null,
        specificationUris: [],
        version: '1.2.3',
      });
    });

    it('should work with a filled package.json file with an expanded bugs URL', () => {
      return expect(runner.packageJsonToEarlProperties({
        bugs: { url: 'BUGS' },
        description: 'DESC',
        homepage: 'HOME',
        name: 'NAME',
        author: 'AUTHOR',
        license: 'LICENSE',
      })).toEqual({
        applicationBugsUrl: 'BUGS',
        applicationDescription: 'DESC',
        applicationHomepageUrl: 'HOME',
        applicationNameFull: 'NAME',
        applicationNameNpm: 'NAME',
        applicationUri: 'https://www.npmjs.com/package/NAME/',
        authors: [
          {
            homepage: null,
            name: 'AUTHOR',
            uri: 'https://www.npmjs.com/package/NAME/#author',
          },
        ],
        licenseUri: 'http://opensource.org/licenses/LICENSE',
        reportUri: null,
        specificationUris: [],
      });
    });
  });
});
