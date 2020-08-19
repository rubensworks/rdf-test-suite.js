# Changelog
All notable changes to this project will be documented in this file.

<a name="v1.13.3"></a>
## [v1.13.3](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.13.2...v1.13.3) - 2020-08-19

### Changed
* [Fix dataGraph URLs not being normalized](https://github.com/rubensworks/rdf-test-suite.js/commit/6c11764bb89bc04d52a2bccaae6aa10082f2c709)

<a name="v1.13.2"></a>
## [v1.13.2](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.13.1...v1.13.2) - 2020-08-14

### Fixed
* [Fix query tests not accepting more than one qt:graphData](https://github.com/rubensworks/rdf-test-suite.js/commit/e6022488bf944d15e73df69556ca0e2ecde213ce)
* [Fix crash when printing timed out test results, Closes #58](https://github.com/rubensworks/rdf-test-suite.js/commit/4e2571cb261736bf3cfa53d77ab300201d6d26eb)

<a name="v1.13.1"></a>
## [v1.13.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.13.0...v1.13.1) - 2020-04-28

### Changed
* [Bump log-symbols and @types/rdf-js](https://github.com/rubensworks/rdf-test-suite.js/commit/1ecb4c88de5280a9cdedeae08311f51e53dbc168)
* [Update dependency jsonld-streaming-parser to v2](https://github.com/rubensworks/rdf-test-suite.js/commit/eff2e5dc651570a057b090f75381016882ebd51e)

<a name="v1.13.0"></a>
## [v1.13.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.12.1...v1.13.0) - 2020-04-03

### Added
* [Support JSON-LD's HTML tests](https://github.com/rubensworks/rdf-test-suite.js/commit/9e4110c5ec373729190651c95b0cfc8284448feb)
* [Emit doap:version in EARL files](https://github.com/rubensworks/rdf-test-suite.js/commit/7d4fc16b89e987206f75e4692e004f74c09775f2)
* [Add negative JSON-LD fromRdf test handler](https://github.com/rubensworks/rdf-test-suite.js/commit/e0cd1cb5ff30e2f306d8aa858b924b6b05bd504e)
* [Pass rdfDirection property to JSON-LD fromRdf](https://github.com/rubensworks/rdf-test-suite.js/commit/1e1ecf27007d6d7852ced09431661e77a2ead9ea)

### Changed
* [Include input data in error message for JSON-LD fromRdf](https://github.com/rubensworks/rdf-test-suite.js/commit/93a6b611b7d02cedf3acd77a2352bb2f14444304)
* [Default JSON-LD fromRdf specVersion to undefined](https://github.com/rubensworks/rdf-test-suite.js/commit/feff65981729c783f60a503cde688c84639faa8c)

<a name="v1.12.1"></a>
## [v1.12.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.12.0...v1.12.1) - 2020-01-27

### Fixed
* [Allow EARL author homepage and name to be undefined](https://github.com/rubensworks/rdf-test-suite.js/commit/5ba5bbfc17d2edf3e2cc7a09c13601384013121b)
* [Don't set default JSON-LD specVersion to 1.0](https://github.com/rubensworks/rdf-test-suite.js/commit/c257defc411e26b2fe5edc381555b3af4b216c6b)

<a name="v1.12.0"></a>
## [v1.12.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.6...v1.12.0) - 2019-12-06

### Added
* [Add JSON-LD toRdf negative test case handler](https://github.com/rubensworks/rdf-test-suite.js/commit/7a83141d42a27777dd7df171c3aa9373bd339417)
* [Handle rdfDirection option in JSON-LD 1.1 test suite](https://github.com/rubensworks/rdf-test-suite.js/commit/0609a249a0a55304afd52d903b5efcacd14f8272)

### Changed
* [Remove unused node-web-streams dependency](https://github.com/rubensworks/rdf-test-suite.js/commit/c0d40b7dfc76a267c94d5f026f489102611ca606)
* [Improve error message on failing negative JSON-LD toRdf tests](https://github.com/rubensworks/rdf-test-suite.js/commit/3e37d2d61b3e15eb6300eb499858fc20355ad7aa)

<a name="v1.11.0"></a>
## [v1.11.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.6...v1.11.0) - 2019-10-02

### Added
* [Enable syntax tests for SPARQL update queries](https://github.com/rubensworks/rdf-test-suite.js/commit/9ad19cacb62c65b88a749fcac4ad240601a60133)

### Changed
* [Mark unsupported tests as skipped tests](https://github.com/rubensworks/rdf-test-suite.js/commit/244a930ab9e6c0788738014b9b39309fb91fe888)

<a name="v1.10.6"></a>
## [v1.10.6](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.5...v1.10.6) - 2019-09-27

### Fixed
* [Fix cached file fetching causing program to hang](https://github.com/rubensworks/rdf-test-suite.js/commit/5c13cdc4f9d01455a04339bef5564102270ddd7a)

<a name="v1.10.5"></a>
## [v1.10.5](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.4...v1.10.5) - 2019-09-27

### Fixed
* [Fix caching failing with binary files](https://github.com/rubensworks/rdf-test-suite.js/commit/1dfee4365254550ece190abb0075b1f5f80b167d)

<a name="v1.10.4"></a>
## [v1.10.4](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.3...v1.10.4) - 2019-09-26

### Changed
* [Throw error when a cached file could not be found](https://github.com/rubensworks/rdf-test-suite.js/commit/81fe9e3fbe4f648ca814bb5a707f2444c6be1403)

### Fixed
* [Fix remote JSON-LD contexts not being cached](https://github.com/rubensworks/rdf-test-suite.js/commit/6e8f1b9f9c4ca3d3898a827492b386f5e4d9e6c9)

<a name="v1.10.3"></a>
## [v1.10.3](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.2...v1.10.3) - 2019-09-18

### Fixed
* [Bump JSON-LD parser to fix failure to parse JSON-LD manifests](https://github.com/rubensworks/rdf-test-suite.js/commit/3a2ad2180fb99534b6c7490c2333660ce0648849)

<a name="v1.10.2"></a>
## [v1.10.2](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.1...v1.10.2) - 2019-09-18

### Fixed
* [Accept JSON-LD manifest expandContext properties as literals](https://github.com/rubensworks/rdf-test-suite.js/commit/2f2fe33ac19e4110c52e9aa5ba9eb6ac26949a34)

<a name="v1.10.1"></a>
## [v1.10.1](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.10.0...v1.10.1) - 2019-09-12

### Changed
* [Show stacktrace on external errors](https://github.com/rubensworks/rdf-test-suite.js/commit/39298fcf73f4593cdcb94f204272f3b7fafd3e05)

### Fixed
* [Fix incorrect blank node canonicalization during bindings comparison](https://github.com/rubensworks/rdf-test-suite.js/commit/f395a651938f262ba890878f2c6ed7674280e50b)
* [Fix incorrect named graph printing in query eval errors](https://github.com/rubensworks/rdf-test-suite.js/commit/9264c5f401638142be0b05ae1813783090ac7214)

<a name="v1.10.0"></a>
## [v1.10.0](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.9.3...v1.10.0) - 2019-09-04

### Added
* [Handle expandContext option in JSON-LD test suite](https://github.com/rubensworks/rdf-test-suite.js/commit/6ce6c228e0664b5d9faa8b75d4f672cf3f2bb399)
* [Handle baseIRI option in JSON-LD test suite](https://github.com/rubensworks/rdf-test-suite.js/commit/47ad4dd021b0c1fe7bdbcf66ca667abe94368373)

### Changed
* [Apply blank node normalization in SPARQL results](https://github.com/rubensworks/rdf-test-suite.js/commit/2151f282a65779c741db26717ae1bf5d485369f1)
* [Compare literals in SPARQL by value, not stricly, Closes #37](https://github.com/rubensworks/rdf-test-suite.js/commit/4e0bc1d7a2fad86a5b44a3a7734da8a65c5169a3)

<a name="v1.9.3"></a>
## [v1.9.3](https://github.com/rubensworks/rdf-test-suite.js/compare/v1.9.0...v1.9.3) - 2019-07-15

### Fixed
* [Fix parsing error in N3 1.1.1](https://github.com/rubensworks/rdf-test-suite.js/commit/14ec6f2baef14859909d4f4479dbc7eac8fe2ea1)

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
