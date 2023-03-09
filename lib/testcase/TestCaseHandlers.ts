import {TestCaseJsonLdFromRdfHandler} from "./rdfsyntax/jsonld/TestCaseJsonLdFromRdf";
import {TestCaseJsonLdFromRdfNegativeHandler} from "./rdfsyntax/jsonld/TestCaseJsonLdFromRdfNegative";
import {TestCaseJsonLdSyntaxHandler} from "./rdfsyntax/jsonld/TestCaseJsonLdSyntax";
import {TestCaseJsonLdToRdfHandler} from "./rdfsyntax/jsonld/TestCaseJsonLdToRdf";
import {TestCaseJsonLdToRdfNegativeHandler} from "./rdfsyntax/jsonld/TestCaseJsonLdToRdfNegative";
import {TestCaseEvalHandler} from "./rdfsyntax/TestCaseEval";
import {TestCaseSyntaxHandler} from "./rdfsyntax/TestCaseSyntax";
import {TestCaseNegativeSyntaxHandler} from "./sparql/TestCaseNegativeSyntax";
import {TestCasePositiveSyntaxHandler} from "./sparql/TestCasePositiveSyntax";
import {TestCaseQueryEvaluationHandler} from "./sparql/TestCaseQueryEvaluation";
import {TestCaseUnsupportedHandler} from "./TestCaseUnsupported";
import { TestCaseUpdateEvaluationHandler } from './sparql/TestCaseUpdateEvaluation';

// tslint:disable:max-line-length
// tslint:disable:object-literal-sort-keys
module.exports = {
  // SPARQL 1.0, SPARQL 1.1 test suite
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#NegativeSyntaxTest':
    new TestCaseNegativeSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#PositiveSyntaxTest':
    new TestCasePositiveSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#QueryEvaluationTest':
    new TestCaseQueryEvaluationHandler(),

  // SPARQL 1.1 test suite
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#NegativeSyntaxTest11':
    new TestCaseNegativeSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#PositiveSyntaxTest11':
    new TestCasePositiveSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#NegativeUpdateSyntaxTest11':
    new TestCaseNegativeSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#PositiveUpdateSyntaxTest11':
    new TestCasePositiveSyntaxHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#UpdateEvaluationTest':
    new TestCaseUpdateEvaluationHandler(),
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#CSVResultFormatTest':
    new TestCaseUnsupportedHandler('sparql:CSVResultFormatTest'), // TODO: implement
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ServiceDescriptionTest':
    new TestCaseUnsupportedHandler('sparql:ServiceDescriptionTest'), // TODO: implement
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#ProtocolTest':
    new TestCaseUnsupportedHandler('sparql:ProtocolTest'), // TODO: implement
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#GraphStoreProtocolTest':
    new TestCaseUnsupportedHandler('sparql:GraphStoreProtocolTest'), // TODO: implement

  // RDF/XML test suite
  'http://www.w3.org/ns/rdftest#TestXMLEval':
    new TestCaseEvalHandler({ normalizeUrl: true }),
  'http://www.w3.org/ns/rdftest#TestXMLNegativeSyntax':
    new TestCaseSyntaxHandler(false),

  // N-Triples test suite
  'http://www.w3.org/ns/rdftest#TestNTriplesPositiveSyntax':
    new TestCaseSyntaxHandler(true),
  'http://www.w3.org/ns/rdftest#TestNTriplesNegativeSyntax':
    new TestCaseSyntaxHandler(false),

  // N-Quads test suite
  'http://www.w3.org/ns/rdftest#TestNQuadsPositiveSyntax':
    new TestCaseSyntaxHandler(true),
  'http://www.w3.org/ns/rdftest#TestNQuadsNegativeSyntax':
    new TestCaseSyntaxHandler(false),

  // Turtle test suite
  'http://www.w3.org/ns/rdftest#TestTurtleEval':
    new TestCaseEvalHandler(),
  'http://www.w3.org/ns/rdftest#TestTurtlePositiveSyntax':
    new TestCaseSyntaxHandler(true),
  'http://www.w3.org/ns/rdftest#TestTurtleNegativeSyntax':
    new TestCaseSyntaxHandler(false),
  'http://www.w3.org/ns/rdftest#TestTurtleNegativeEval':
    new TestCaseSyntaxHandler(false),

  // TriG test suite
  'http://www.w3.org/ns/rdftest#TestTrigEval':
    new TestCaseEvalHandler(),
  'http://www.w3.org/ns/rdftest#TestTrigPositiveSyntax':
    new TestCaseSyntaxHandler(true),
  'http://www.w3.org/ns/rdftest#TestTrigNegativeSyntax':
    new TestCaseSyntaxHandler(false),
  'http://www.w3.org/ns/rdftest#TestTrigNegativeEval':
    new TestCaseSyntaxHandler(false),

  // JSON-LD test suite
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest':
    new TestCaseJsonLdToRdfHandler(),
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveSyntaxTest':
    new TestCaseJsonLdSyntaxHandler(true),
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest':
    new TestCaseJsonLdToRdfNegativeHandler(),
  'https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest':
    new TestCaseJsonLdFromRdfHandler(),
  'https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest':
    new TestCaseJsonLdFromRdfNegativeHandler(),

  // RDFa test suite
  'http://rdfa.info/vocabs/rdfa-test#PositiveEvaluationTest':
    new TestCaseEvalHandler(),
  'http://rdfa.info/vocabs/rdfa-test#NegativeEvaluationTest':
    new TestCaseSyntaxHandler(true), // RDFa test suite never expect errors, just empty documents

  // Microdata-RDF test suite
  'http://www.w3.org/ns/rdftest#TestMicrodataEval':
    new TestCaseEvalHandler(),
  'http://www.w3.org/ns/rdftest#TestMicrodataNegativeSyntax':
    new TestCaseSyntaxHandler(true), // Microdata-RDF test suite never expect errors, just empty documents

  // N3 test suite
  'https://w3c.github.io/N3/tests/test.n3#TestN3PositiveSyntax':
    new TestCaseSyntaxHandler(true),
  'https://w3c.github.io/N3/tests/test.n3#TestN3NegativeSyntax':
    new TestCaseSyntaxHandler(false),
  'https://w3c.github.io/N3/tests/test.n3#TestN3Eval':
    new TestCaseEvalHandler(),

};
// tslint:enable:object-literal-sort-keys
// tslint:enable:max-line-length
