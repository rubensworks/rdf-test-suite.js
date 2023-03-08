# RDF-Test-Suite.js

[![Build status](https://github.com/rubensworks/rdf-test-suite.js/workflows/CI/badge.svg)](https://github.com/rubensworks/rdf-test-suite.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/rdf-test-suite.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/rdf-test-suite.js?branch=master)
[![npm version](https://badge.fury.io/js/rdf-test-suite.svg)](https://www.npmjs.com/package/rdf-test-suite)

This tool executes the [RDF](https://www.w3.org/TR/rdf11-testcases/)
and [SPARQL](https://w3c.github.io/rdf-tests/sparql11/) test suites
with any given system.

It can either output human-readable test results to the console,
or it can output machine-readable reports in the
[EARL](https://www.w3.org/TR/EARL10-Schema/) vocabulary.

Currently, the following test suites are supported:
* [SPARQL 1.0](https://w3c.github.io/rdf-tests/sparql11/data-r2/)
* [SPARQL 1.1](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) (_only [SPARQL 1.1 Query](http://www.w3.org/TR/sparql11-query/) spec_)
* [RDF/XML](http://w3c.github.io/rdf-tests/rdf-xml/)
* [N-Triples](https://w3c.github.io/rdf-tests/ntriples/)
* [N-Quads](https://w3c.github.io/rdf-tests/nquads/)
* [Turtle](https://w3c.github.io/rdf-tests/turtle/)
* [TriG](https://w3c.github.io/rdf-tests/trig/)
* [JSON-LD (1.0 and 1.1)](https://w3c.github.io/json-ld-api/tests/)
* [RDFa](http://rdfa.info/test-suite/)
* [Microdata to RDF](https://w3c.github.io/microdata-rdf/tests/)
* [Notation3](https://w3c.github.io/N3/spec/)
* [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html)
* [JSON-LD-Star](https://json-ld.github.io/json-ld-star/)

Not all [RDF test suites](https://w3c.github.io/rdf-tests/) are supported at the moment.
However, this package is fully _modular_,
so that support for different test cases can be implemented easily.

Planned support:
* [SPARQL 1.1](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) (_other specifications_)
* [RDF Schema and Semantics](https://w3c.github.io/rdf-tests/rdf-mt/reports/)
* [JSON-LD](https://w3c.github.io/json-ld-api/tests/) (_other test suites_)

## Installation

Either install it globally:

```bash
$ yarn global add rdf-test-suite
```

Or locally (as a dev dependency):

```bash
$ yarn add --dev rdf-test-suite
```

## Usage

After installing, the `rdf-test-suite` script will become available.

This script requires some kind of _engine_ as first argument,
and a test suite manifest URL as second argument.

The engine is a JavaScript file that can handle the test suite.
The interface of this engine depends on the manifest.
For example, the SPARQL 1.1 test suite requires an
[`IQueryEngine`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/sparql/IQueryEngine.ts),
while the RDF/XML test suite requires a
[`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts).

### Basic execution

The following command executes the SPARQL 1.1 test suite
on the engine `myengine.js`:

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl
```

An example of what this `myengine.js` looks like
is available for the [Comunica SPARQL engine](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql/spec/sparql-engine.js).

This command will output something like this:
```
...
✔ syn-bad-pname-04 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_04) 0.293588ms
✔ syn-bad-pname-05 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_05) 0.498646ms
✔ syn-bad-pname-06 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_06) 0.513092ms
✔ syn-bad-pname-07 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_07) 0.498646ms
✔ syn-bad-pname-08 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_08) 0.293588ms
✔ syn-bad-pname-09 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_09) 0.293588ms
✔ syn-bad-pname-10 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_10) 0.516346ms
✔ syn-bad-pname-11 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_11) 0.498646ms
✔ syn-bad-pname-12 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_12) 0.516346ms
✔ syn-bad-pname-13 (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pn_bad_13) 0.498646ms
✔ syn-pp-in-collection (http://www.w3.org/2009/sparql/docs/tests/data-sparql11/syntax-query/manifest#test_pp_coll) 0.516346ms
✖ 105 / 268 tests succeeded!
```

### Test filtering

With the `-t` option, you can filter tests that should be executed
based on a regex that will be matched with the test URI.

For example:

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -t test_pn_bad_0
```

### Summarized output

By default, the printed test results are verbose,
and print expanded views of failed tests.

You can change this to a more compact view using `-o summary`.

For example:

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -o summary
```

### EARL output

Test results are human readable by default.
This can be changed to output machine-readable reports in the
[EARL](https://www.w3.org/TR/EARL10-Schema/) vocabulary
in the [Turtle serialization](https://www.w3.org/TR/turtle/).
These reports can be published to report the compliance of engines
to certain specifications, like on
[W3C’s RDF Test Curation Community Group](https://w3c.github.io/rdf-tests/).

As EARL reports require some metadata on your engine,
you will need to provide a properties file via the `-p` argument.

This properties file can look something like this:
```json
{
  "applicationBugsUrl": "https://github.com/comunica/comunica/issues",
  "applicationDescription": "A Comunica engine for SPARQL query evaluation over heterogeneous interfaces",
  "applicationHomepageUrl": "http://comunica.linkeddatafragments.org/",
  "applicationNameFull": "Comunica SPARQL",
  "applicationNameNpm": "@comunica/actor-init-sparql",
  "applicationUri": "https://www.npmjs.com/package/@comunica/actor-init-sparql",
  "authors": [
    {
      "homepage": "https://www.rubensworks.net/",
      "name": "Ruben Taelman",
      "uri": "https://www.rubensworks.net/#me"
    }
  ],
  "licenseUri": "http://opensource.org/licenses/MIT",
  "reportUri": null,
  "specificationUris": [
      "http://www.w3.org/TR/sparql11-query/"
  ],
  "version": "1.2.3"
}
```

The properties file can point to a non-existing file,
in which case it will be auto-generated from the `package.json`
file in the current working directory.

For example:

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -o earl -p earl-meta.json
```

### Restricting execution to certain specifications

Some test suites (like the one of SPARQL 1.1) contains
tests for multiple specifications.
If you only want to test your system for a single specification,
then you can define this with the `-s` parameter.

For example, the following command executes the SPARQL 1.1 test cases
that apply to the [http://www.w3.org/TR/sparql11-query/](http://www.w3.org/TR/sparql11-query/)
specification.

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -s http://www.w3.org/TR/sparql11-query/
```

### Enabling HTTP caching

By default, `rdf-test-suite` will look up all required manifest files.
If this takes too much time, or if you don't have internet connection,
then you can enable HTTP caching with the `-c` argument,
so that all files only have to be looked up once.

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -c path/to/cache/
```
_If you don't provide a caching value after the `-c`,
then the directory will default to `.rdf-test-suite-cache/`._

### Ignore exit code

When there are failing tests,
`rdf-test-suite` will exit with code `1` instead of `0`.
This can be useful in Continuous Integration tools.

If you want to disable this behaviour,
you can add the `-e` flag to force an exit code `0`.

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -e
```

### Pass custom options to the engine

With the optional `-i` option,
a JSON string with arguments can be passed to the engine.
These arguments will become available in
both [`IQueryEngine`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/sparql/IQueryEngine.ts),
and [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts).

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -i '{ "myProperty": "myValue" }'
```

### Test timeouts

By default, all tests are allowed to run 3000 ms.
Using the `-d` option, you can change this value.

```bash
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -d 5000
```

### Map URLs to local files

In cases where you are developing your own test manifests,
it may be useful to intercept certain URL lookups
and return local files instead.

In order to achieve this, the `-m` option can be used,
with a mapping defined with the following pattern: `URL~PATH`.

```
$ rdf-test-suite myengine.js http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl \
  -m http://w3c.github.io/rdf-tests/sparql11/data-sparql11/~/path/to/my/files/
```

## Supported test suites

| Manifest | Specification | Interface | Entry manifest |
| -------- | ------------- | --------- | -------------- |
| [SPARQL 1.0 tests](https://w3c.github.io/rdf-tests/sparql11/data-r2/) | [SPARQL 1.0](https://www.w3.org/TR/rdf-sparql-query/) | [`IQueryEngine`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/sparql/IQueryEngine.ts) | https://w3c.github.io/rdf-tests/sparql11/data-r2/manifest.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Query](http://www.w3.org/TR/sparql11-query/) | [`IQueryEngine`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/sparql/IQueryEngine.ts) | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Update](http://www.w3.org/TR/sparql11-update/) | [`IUpdateEngine`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/sparql/IUpdateEngine.ts) | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Results CSV/TSV](http://www.w3.org/TR/sparql11-results-csv-tsv/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Results JSON](http://www.w3.org/TR/sparql11-results-json/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Federated Query](http://www.w3.org/TR/sparql11-federated-query/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Entailment](http://www.w3.org/TR/sparql11-entailment/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Service Description](http://www.w3.org/TR/sparql11-service-description/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 Protocol](http://www.w3.org/TR/sparql11-protocol/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [SPARQL 1.1 tests](http://w3c.github.io/rdf-tests/sparql11/data-sparql11/) | [SPARQL 1.1 HTTP RDF Update](http://www.w3.org/TR/sparql11-http-rdf-update/) | ✖ | http://w3c.github.io/rdf-tests/sparql11/data-sparql11/manifest-all.ttl |
| [RDF/XML Syntax Tests](https://w3c.github.io/rdf-tests/rdf-xml/) | [RDF 1.1 XML Syntax](https://www.w3.org/TR/rdf-syntax-grammar/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://w3c.github.io/rdf-tests/rdf-xml/manifest.ttl |
| [N-Triples Tests](https://w3c.github.io/rdf-tests/ntriples/) | [RDF 1.1 N-Triples](https://www.w3.org/TR/n-triples/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://w3c.github.io/rdf-tests/ntriples/manifest.ttl |
| [N-Quads Tests](https://w3c.github.io/rdf-tests/nquads/) | [RDF 1.1 N-Quads](https://www.w3.org/TR/n-quads/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://w3c.github.io/rdf-tests/nquads/manifest.ttl |
| [Turtle Tests](https://w3c.github.io/rdf-tests/turtle/) | [RDF 1.1 Turtle](https://www.w3.org/TR/turtle/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://w3c.github.io/rdf-tests/turtle/manifest.ttl |
| [TriG Tests](https://w3c.github.io/rdf-tests/trig/) | [RDF 1.1 TriG](https://www.w3.org/TR/trig/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://w3c.github.io/rdf-tests/trig/manifest.ttl |
| [JSON-LD Test Suite](https://w3c.github.io/json-ld-api/tests/) | [JSON-LD (1.0 and 1.1)](https://www.w3.org/TR/json-ld/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | https://w3c.github.io/json-ld-api/tests/toRdf-manifest.jsonld |
| [JSON-LD Test Suite](https://w3c.github.io/json-ld-api/tests/) | [JSON-LD (1.0 and 1.1)](https://www.w3.org/TR/json-ld/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | https://w3c.github.io/json-ld-api/tests/html-manifest.jsonld |
| [JSON-LD Test Suite](https://w3c.github.io/json-ld-api/tests/) | [JSON-LD (1.0 and 1.1)](https://www.w3.org/TR/json-ld/) | [`ISerializer`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/ISerializer.ts) | https://w3c.github.io/json-ld-api/tests/fromRdf-manifest.jsonld |
| [JSON-LD-Star Test Suite](https://json-ld.github.io/json-ld-star/tests/) | [JSON-LD-Star](https://json-ld.github.io/json-ld-star/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | https://json-ld.github.io/json-ld-star/tests/toRdf-manifest.jsonld |
| [JSON-LD-Star Test Suite](https://json-ld.github.io/json-ld-star/tests/) | [JSON-LD-Star](https://json-ld.github.io/json-ld-star/) | [`ISerializer`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/ISerializer.ts) | https://json-ld.github.io/json-ld-star/tests/fromRdf-manifest.jsonld |
| [RDFa Test Suite](http://rdfa.info/test-suite/) | [RDFa 1.1](https://www.w3.org/TR/html-rdfa/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | http://rdfa.info/test-suite/test-cases/rdfa1.1/html5/manifest.ttl |
| [Microdata to RDF Test Suite](https://w3c.github.io/microdata-rdf/tests/) | [Microdata to RDF](https://w3c.github.io/microdata-rdf/) | [`IParser`](https://github.com/rubensworks/rdf-test-suite.js/blob/master/lib/testcase/rdfsyntax/IParser.ts) | https://w3c.github.io/microdata-rdf/tests/manifest.ttl |
| [Turtle-star Evaluation Tests](https://w3c.github.io/rdf-star/tests/turtle/eval/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/turtle/eval/manifest.jsonld |
| [Turtle-star Syntax Tests](https://w3c.github.io/rdf-star/tests/turtle/syntax/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/turtle/syntax/manifest.jsonld |
| [TriG-star Evaluation Tests](https://w3c.github.io/rdf-star/tests/trig/eval/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/trig/eval/manifest.jsonld |
| [TriG-star Syntax Tests](https://w3c.github.io/rdf-star/tests/trig/eval/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/trig/syntax/manifest.jsonld |
| [N-Triples-star Syntax Tests](https://w3c.github.io/rdf-star/tests/nt/syntax/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/nt/syntax/manifest.jsonld |
| [RDF-star Semantics tests](https://w3c.github.io/rdf-star/tests/semantics/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/semantics/manifest.jsonld |
| [SPARQL-star Syntax Tests](https://w3c.github.io/rdf-star/tests/sparql/syntax/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/sparql/syntax/manifest.jsonld |
| [SPARQL-star Evaluation Tests](https://w3c.github.io/rdf-star/tests/sparql/eval/manifest.html) | [RDF-star and SPARQL-star](https://www.w3.org/2021/12/rdf-star.html) | ✖ | https://w3c.github.io/rdf-star/tests/sparql/eval/manifest.jsonld |

## License
This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
