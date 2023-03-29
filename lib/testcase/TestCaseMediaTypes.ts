
// The media mappings for each parsing test suite

export default {
  // RDF/XML test suite
  'http://www.w3.org/ns/rdftest#TestXMLEval': "application/xml",
  'http://www.w3.org/ns/rdftest#TestXMLNegativeSyntax': "application/xml",

  // N-Triples test suite
  'http://www.w3.org/ns/rdftest#TestNTriplesPositiveSyntax': "application/n-triples",
  'http://www.w3.org/ns/rdftest#TestNTriplesNegativeSyntax': "application/n-triples",

  // N-Quads test suite
  'http://www.w3.org/ns/rdftest#TestNQuadsPositiveSyntax': "application/n-quads",
  'http://www.w3.org/ns/rdftest#TestNQuadsNegativeSyntax': "application/n-quads",

  // Turtle test suite
  'http://www.w3.org/ns/rdftest#TestTurtleEval': "text/turtle",
  'http://www.w3.org/ns/rdftest#TestTurtlePositiveSyntax': "text/turtle",
  'http://www.w3.org/ns/rdftest#TestTurtleNegativeSyntax': "text/turtle",
  'http://www.w3.org/ns/rdftest#TestTurtleNegativeEval': "text/turtle",

  // TriG test suite
  'http://www.w3.org/ns/rdftest#TestTrigEval': "application/trig",
  'http://www.w3.org/ns/rdftest#TestTrigPositiveSyntax': "application/trig",
  'http://www.w3.org/ns/rdftest#TestTrigNegativeSyntax': "application/trig",
  'http://www.w3.org/ns/rdftest#TestTrigNegativeEval': "application/trig",

  // JSON-LD test suite
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest': "application/ld+json",
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveSyntaxTest': "application/ld+json",
  'https://w3c.github.io/json-ld-api/tests/vocab#ToRDFTest https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest': "application/ld+json",
  'https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest https://w3c.github.io/json-ld-api/tests/vocab#PositiveEvaluationTest': "application/ld+json",
  'https://w3c.github.io/json-ld-api/tests/vocab#FromRDFTest https://w3c.github.io/json-ld-api/tests/vocab#NegativeEvaluationTest': "application/ld+json",

  // RDFa test suite
  'http://rdfa.info/vocabs/rdfa-test#PositiveEvaluationTest': "text/html",
  'http://rdfa.info/vocabs/rdfa-test#NegativeEvaluationTest': "text/html",

  // Microdata-RDF test suite
  'http://www.w3.org/ns/rdftest#TestMicrodataEval': "application/xml",
  'http://www.w3.org/ns/rdftest#TestMicrodataNegativeSyntax': "application/xml",

  // N3 test suite
  'https://w3c.github.io/N3/tests/test.n3#TestN3PositiveSyntax': "text/n3",
  'https://w3c.github.io/N3/tests/test.n3#TestN3NegativeSyntax': "text/n3",
  'https://w3c.github.io/N3/tests/test.n3#TestN3Eval': "text/n3",
} as Partial<Record<string, string>>;
