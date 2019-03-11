#!/usr/bin/env node
import {existsSync, mkdirSync, writeFileSync} from "fs";
import minimist = require("minimist");
import {StreamWriter} from "n3";
import * as Path from "path";
import {ITestResult, ITestSuiteConfig, TestSuiteRunner} from "../lib/TestSuiteRunner";

// tslint:disable:no-console
// tslint:disable:no-var-requires

const args = minimist(process.argv.slice(2));

if (args._.length < 2) {
  console.error(`sparql-test executes SPARQL test suites

Usage:
  rdf-test-suite path/to/myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl
  rdf-test-suite path/to/myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
    -s http://www.w3.org/TR/sparql11-query/
  rdf-test-suite path/to/myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
    -o earl -p earl-meta.json > earl.ttl

Options:
  -o    output format (detailed, summary, eurl, ... defaults to detailed)
  -p    file with earl properties, autogenerated from package.json if not available (only needed for EARL reports)
  -s    a specification URI to filter by (e.g. http://www.w3.org/TR/sparql11-query/)
  -c    enable HTTP caching at the given directory (disabled by default)
  -e    always exit with status code 0 on test errors
  -t    regex for test IRIs to run
  -i    JSON string with custom options that need to be passed to the engine
  -d    Time out duration for test cases (in milliseconds, default 3000)
`);
  process.exit(1);
}

// Enable caching if needed
// tslint:disable-next-line: variable-name
let _cachePath: string = null;
if (args.c) {
  _cachePath = Path.join(process.cwd(), (args.c === true ? '.rdf-test-suite-cache/' : args.c));
  if (!existsSync(_cachePath)) {
    mkdirSync(_cachePath);
  }
}

// Import the engine
const engine = require(process.cwd() + '/' + args._[0]);

const defaultConfig = {
  exitWithStatusCode0: false,
  outputFormat: 'detailed',
  timeOutDuration: 3000,
};

const config: ITestSuiteConfig = {
  cachePath: _cachePath,
  customEngingeOptions: args.i ? JSON.parse(args.i) : {},
  exitWithStatusCode0: !!args.e || defaultConfig.exitWithStatusCode0,
  outputFormat: args.o || defaultConfig.outputFormat,
  specification: args.s,
  testRegex: new RegExp(args.t),
  timeOutDuration: args.d || defaultConfig.timeOutDuration,
};

// Fetch the manifest, run the tests, and print them
const testSuiteRunner = new TestSuiteRunner();
testSuiteRunner.runManifest(args._[1], engine, config)
  .then((testResults) => {
    switch (config.outputFormat) {
    case 'earl':
      if (!args.p) {
        throw new Error(`EARL reporting requires the -p argument to point to an earl-meta.json file.`);
      }
      // Create properties file if it does not exist
      if (!existsSync(Path.join(process.cwd(), args.p))) {
        writeFileSync(Path.join(process.cwd(), args.p),
          JSON.stringify(testSuiteRunner.packageJsonToEarlProperties(require(Path.join(process.cwd(), 'package.json'))),
            null, '  '));
      }
      (<any> testSuiteRunner.resultsToEarl(testResults, require(Path.join(process.cwd(), args.p)), new Date()))
        .pipe(new StreamWriter({ format: 'text/turtle', prefixes: require('../lib/prefixes.json') }))
        .pipe(process.stdout)
        .on('end', () => onEnd(testResults));
      break;
    case 'summary':
      testSuiteRunner.resultsToText(process.stdout, testResults, true);
      onEnd(testResults);
      break;
    default:
      testSuiteRunner.resultsToText(process.stdout, testResults, false);
      onEnd(testResults);
      break;
    }
  }).catch(console.error);

function onEnd(testResults: ITestResult[]) {
  // Exit with status code 1 if there was at least one failing test
  if (!config.exitWithStatusCode0) {
    for (const testResult of testResults) {
      if (!testResult.skipped && !testResult.ok) {
        process.exit(1);
      }
    }
  }
}
