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
  test: () => Promise.reject(new Error('Fail')),
  uri: 'http://ex.org/test3',
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
        } else {
          return Promise.resolve({
            uri: manifestUrl,
          });
        }
      },
    };
  },
}));

import "jest-rdf";
import * as LogSymbols from "log-symbols";
import {PassThrough} from "stream";
import {TestSuiteRunner} from "../lib/TestSuiteRunner";

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

  describe('runManifest', () => {
    it('should produce an empty array for an empty manifest', () => {
      return expect(runner.runManifest('empty', handler, null, null)).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest', () => {
      return expect(runner.runManifest('valid', handler, null, null)).resolves.toEqual([
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
      ]);
    });

    it('should produce results for a valid manifest with submanifests', () => {
      return expect(runner.runManifest('validsub', handler, null, null)).resolves.toEqual([
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
      ]);
    });

    it('should produce empty results for a valid manifest without the requested specifications', () => {
      return expect(runner.runManifest('valid', handler, null, 'spec1')).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest with the requested specifications', () => {
      return expect(runner.runManifest('validspec', handler, null, 'spec1')).resolves.toEqual([
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
      ]);
    });

    it('should produce results for a valid manifest with a non-matching regex', () => {
      return expect(runner.runManifest('valid', handler, null, null, /abc/)).resolves.toEqual([]);
    });

    it('should produce results for a valid manifest with a single-matching regex', () => {
      return expect(runner.runManifest('valid', handler, null, null, /1/)).resolves.toEqual([
        {
          ok: true,
          test: mockTest1,
        },
      ]);
    });

    it('should produce results for a valid manifest with a multiple-matching regex', () => {
      return expect(runner.runManifest('valid', handler, null, null, /^.*test.*$/)).resolves.toEqual([
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
        error: new Error('Fail'),
        ok: false,
        test: mockTest3,
      },
    ];

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
            uri: null,
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
            uri: null,
          },
        ],
        licenseUri: 'http://opensource.org/licenses/LICENSE',
        reportUri: null,
        specificationUris: [],
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
            uri: null,
          },
        ],
        licenseUri: 'http://opensource.org/licenses/LICENSE',
        reportUri: null,
        specificationUris: [],
      });
    });
  });
});
