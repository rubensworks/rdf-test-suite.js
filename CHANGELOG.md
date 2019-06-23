# Changelog
All notable changes to this project will be documented in this file.

<a name="v1.9.2"></a>
## [v1.9.2](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.9.1...v1.9.2) - 2019-06-23

### Changed
* [Properly pass format to N3 parsers](https://github.com/rubensworks/rdf-test-suite.js/commit/1d226164275fecf6d42e98a22ea5b7ee0aa88151)
* [Improve hack to allow blank node predicates in Turtle](https://github.com/rubensworks/rdf-test-suite.js/commit/34b3ef4949520ceb5de3e669620615a1279ff740)

<a name="v1.9.1"></a>
## [v1.9.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.9.0...v1.9.1) - 2019-06-20

### Fixed
* [Don't expect errors in rdfa:NegativeEvaluationTest](https://github.com/rubensworks/rdf-test-suite.js/commit/5d8cec94e7d0022d0aa9001f773b68e19ff54bd5)

<a name="v1.9.0"></a>
## [v1.9.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.8.2...v1.9.0) - 2019-06-04

### Added
* [Add RDFa test case handlers](https://github.com/rubensworks/rdf-test-suite.js/commit/d469795a8cf14bb3a242aef5a6e86015f3b75537)
* [Allow extension-less manifests to be loaded](https://github.com/rubensworks/rdf-test-suite.js/commit/8aa652f3c3de14b1e6b9b08c75aa96b8e172731f)

<a name="v1.8.2"></a>
## [v1.8.2](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.8.1...v1.8.2) - 2019-04-10

### Fixed
* [Fix SPARQL qt:graphData not loading into named graph](https://github.com/rubensworks/rdf-test-suite.js/commit/75ee246a47e21fbc6b764cbabd427f7075d19b6b)

<a name="v1.8.1"></a>
## [v1.8.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.8.0...v1.8.1) - 2019-04-10

### Fixed
* [Pass baseIRI to SPARQL engines and parsers](https://github.com/rubensworks/rdf-test-suite.js/commit/741cdf92b788229824f2d4a46799f8c679bd6199)

<a name="v1.8.0"></a>
## [v1.8.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.7.0...v1.8.0) - 2019-04-09

### Added
* [Allow mapping URLs to local files](https://github.com/rubensworks/rdf-test-suite.js/commit/27684611077be885cde739592fbcd9d97cbc7873)

### Fixed
* [Fix non-deterministic equality test for objects](https://github.com/rubensworks/rdf-test-suite.js/commit/750bb4fa7e0f55df43ddd0749e37864af2ec473f)
* [Fix test suite hanging for a while after complete](https://github.com/rubensworks/rdf-test-suite.js/commit/1d36ab0b93fd86cb28ab70ab7458116c4169513c)

### Changed
* [Abstract fetching options into hash object](https://github.com/rubensworks/rdf-test-suite.js/commit/426f5840637e12385abf6e2ac4bd47d1c980bf2f)

<a name="v1.7.0"></a>
## [v1.7.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.6.0...v1.7.0) - 2019-04-02

### Added
* [Add support for JSON-LD fromRdf tests](https://github.com/rubensworks/rdf-test-suite.js/commit/116f653d6c0dd15c851f126f5ac0fe4c145a12b1)

<a name="v1.6.0"></a>
## [v1.6.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.5.3...v1.6.0) - 2019-03-18

### Added
* [Handle test cases that time out gracefully](https://github.com/rubensworks/rdf-test-suite.js/commit/294be937f5340025284138fc3de9fb70d512081e)

<a name="v1.5.3"></a>
## [v1.5.3](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.5.2...v1.5.3) - 2019-02-13

### Fixed
* [Bump JSON-LD streamer with fix for failure to parse new JSON-LD tests](https://github.com/rubensworks/rdf-test-suite.js/commit/176c91caa6b98d5aed0cd5107e27e686258eb6eb)

<a name="v1.5.2"></a>
## [v1.5.2](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.5.1...v1.5.2) - 2019-02-13

### Fixed
* [Fix skipped test producing a non-zero exit code](https://github.com/rubensworks/rdf-test-suite.js/commit/b5701bfbe7fb145d52696511006500127c963c96)

### Changed
* [Update JSON-LD test suite vocab URL in context](https://github.com/rubensworks/rdf-test-suite.js/commit/755d288188595b49c6bef619c520c69692f21933)
* [Deprecate old JSON-LD test suite](https://github.com/rubensworks/rdf-test-suite.js/commit/7fa65d22fc2f17670d5a695aec0e7bddac3ff573)

<a name="v1.5.1"></a>
## [v1.5.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.5.0...v1.5.1) - 2019-02-13

### Added
* [Print query result source URL](https://github.com/rubensworks/rdf-test-suite.js/commit/a3fc0c4146ac73034ea0cdd2028b02e2606a1333)

### Fixed
* [Bump sparqlxml-parse to 1.2.1](https://github.com/rubensworks/rdf-test-suite.js/commit/d81b06309272cb93291dbc802ca48db45c358784)

<a name="v1.5.0"></a>
## [v1.5.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.4.0...v1.5.0) - 2019-02-12

### Added
* [Add support for new JSON-LD test suite](https://github.com/rubensworks/rdf-test-suite.js/commit/e362d0e811e95bd21bb3ba2fa421636d37f97eee)

<a name="v1.4.0"></a>
## [v1.4.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.3.0...v1.4.0) - 2019-02-07

### Added
* [Allow tests to be skipped](https://github.com/rubensworks/rdf-test-suite.js/commit/9ae22af5aa9eab1058ddce832fbf34d06f2610ff)
* [Add JSON-LD NegativeEvaluationTest](https://github.com/rubensworks/rdf-test-suite.js/commit/0ad9a62f6733f9654efc95d620f0b0500804f042)
* [Add JSON-LD test case handler](https://github.com/rubensworks/rdf-test-suite.js/commit/23037fd6307bc2514538f3fd5613b9514b175739)

<a name="v1.3.0"></a>
## [v1.3.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.2.0...v1.3.0) - 2019-02-04

### Changed
* [Print the data uri for a sparql query evaluation in verbose mode](https://github.com/rubensworks/rdf-test-suite.js/commit/3275cee924540fad69ee1815e8e110917d132f82)
* [Always include input when logging test errors](https://github.com/rubensworks/rdf-test-suite.js/commit/726438b72dbb25dc1aa8ca77ace2cb339acc3e23)

<a name="v1.2.0"></a>
## [v1.2.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.1.1...v1.2.0) - 2018-12-04

### Added
* [Allow custom options to be passed from command line to engines](https://github.com/rubensworks/rdf-test-suite.js/commit/a5fa45e0a0b437aabc0546917114d263f168871b)
* [Support N-Triples, N-Quads, Turtle and TriG](https://github.com/rubensworks/rdf-test-suite.js/commit/3994d742adea2a37e332c30e1456fbd4789e761d)
* [Add .nq extension contentType mapping](https://github.com/rubensworks/rdf-test-suite.js/commit/edbf5aae329b3942c734d5de98d52b45af8ef847)

<a name="v1.1.1"></a>
## [v1.1.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.1.0...v1.1.1) - 2018-11-08

### Fixed
* [Fix invalid sorting of query solutions](https://github.com/rubensworks/rdf-test-suite.js/commit/aa740ee258c05b13a0615b78b8f82f4c5f18f2cc)

<a name="v1.1.0"></a>
## [v1.1.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.0.0...v1.1.0) - 2018-11-08

### Added
* [Allow filtering tests by IRI regex](https://github.com/rubensworks/rdf-test-suite.js/commit/d90407c32829f4a3e2f4da143332f55d322098c2)
* [Add settings option to IParser](https://github.com/rubensworks/rdf-test-suite.js/commit/b530fd0e39e33bc41bda5777a782f0cde9913cd5)
* [Add GeneralizedN3StreamParser for parsing generalized RDF](https://github.com/rubensworks/rdf-test-suite.js/commit/ba75466c1f12aad73ec912c78fb2033c55631562)
* [Support parsing of N-Quads](https://github.com/rubensworks/rdf-test-suite.js/commit/ae05b221579461ddf489baf682a2aee4132eae43)

### Changed
* [Update to generic RDFJS typings](https://github.com/rubensworks/rdf-test-suite.js/commit/435b16a00b7b92d394067caee9cb9d479e6eccc7)
* [Reject when manifests are not self-descriptive](https://github.com/rubensworks/rdf-test-suite.js/commit/bbb8ba315380380ef5f512604d3533b8537f30dc)
* [Improve error reporting for RDF/XML tests](https://github.com/rubensworks/rdf-test-suite.js/commit/1c17e8374332b3bf8ec6434bc7db32aeedf263e2)

<a name="1.0.0"></a>
## [1.0.0] - 2018-09-28
* Initial release
