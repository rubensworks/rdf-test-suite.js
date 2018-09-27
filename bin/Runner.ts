#!/usr/bin/env node
import {existsSync, mkdirSync} from "fs";
import minimist = require("minimist");
import {TestSuiteRunner} from "../lib/TestSuiteRunner";

// tslint:disable:no-console
// tslint:disable:no-var-requires

const args = minimist(process.argv.slice(2));

if (args._.length < 2) {
  console.error(`sparql-test executes SPARQL test suites

Usage:
  rdf-test-suite path/to/myengine.js https://www.w3.org/2001/sw/DataAccess/tests/data-r2/manifest-evaluation.ttl

Options:
  -o    output format (detailed, summary, eurl, ... defaults to detailed)
  -s    a specification URI to filter by (e.g. http://www.w3.org/TR/sparql11-query/)
  -c    enable HTTP caching at the given directory (disabled by default)
  -e    always exit with status code 0 on test errors
`);
  process.exit(1);
}

// Set format
let format = 'detailed';
if (args.o) {
  format = args.o;
}

// Scope to a specification
const specification = args.s;

// Enable caching if needed
let cachePath: string = null;
if (args.c) {
  cachePath = process.cwd() + (args.c === true ? '.rdf-test-suite-cache/' : args.c);
  if (!existsSync(cachePath)) {
    mkdirSync(cachePath);
  }
}

// Import the engine
const engine = require(process.cwd() + '/' + args._[0]);

// Fetch the manifest, run the tests, and print them
const testSuiteRunner = new TestSuiteRunner();
testSuiteRunner.runManifest(args._[1], engine, cachePath, specification)
  .then((testResults) => {
    switch (format) {
    case 'eurl':
      testSuiteRunner.resultsToEarl(testResults);
      break;
    case 'summary':
      testSuiteRunner.resultsToText(process.stdout, testResults, true);
      break;
    default:
      testSuiteRunner.resultsToText(process.stdout, testResults, false);
      break;
    }

    // Exit with status code 1 if there was at least one failing test
    if (!args.e) {
      for (const testResult of testResults) {
        if (!testResult.ok) {
          process.exit(1);
        }
      }
    }
  });
