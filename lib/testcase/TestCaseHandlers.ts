import {TestCaseXmlEvalHandler} from "./rdfsyntax/xml/TestCaseXmlEval";
import {TestCaseXmlNegativeSyntaxHandler} from "./rdfsyntax/xml/TestCaseXmlNegativeSyntax";
import {TestCaseNegativeSyntaxHandler} from "./sparql/TestCaseNegativeSyntax";
import {TestCasePositiveSyntaxHandler} from "./sparql/TestCasePositiveSyntax";
import {TestCaseQueryEvaluationHandler} from "./sparql/TestCaseQueryEvaluation";
import {TestCaseUnsupportedHandler} from "./TestCaseUnsupported";

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
    new TestCaseUnsupportedHandler('sparql:NegativeUpdateSyntaxTest11'), // TODO: implement
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#PositiveUpdateSyntaxTest11':
    new TestCaseUnsupportedHandler('sparql:PositiveUpdateSyntaxTest11'), // TODO: implement
  'http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#UpdateEvaluationTest':
    new TestCaseUnsupportedHandler('sparql:UpdateEvaluationTest'), // TODO: implement
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
    new TestCaseXmlEvalHandler(),
  'http://www.w3.org/ns/rdftest#TestXMLNegativeSyntax':
    new TestCaseXmlNegativeSyntaxHandler(),
};
// tslint:enable:object-literal-sort-keys
