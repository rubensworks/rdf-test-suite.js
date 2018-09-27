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

import * as LogSymbols from "log-symbols";
import {PassThrough} from "stream";
import {TestSuiteRunner} from "../lib/TestSuiteRunner";

// tslint:disable:no-var-requires
const stringifyStream = require('stream-to-string');

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

    it('should not be implemented yet', () => {
      return expect(runner.resultsToEarl(testResults)).toEqual(null);
    });
  });
});
