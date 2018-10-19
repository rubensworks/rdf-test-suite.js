import {ManifestLoader} from "../lib/ManifestLoader";

// tslint:disable:no-var-requires
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = (url: string) => {
  let body;
  switch (url) {
  case 'http://valid1':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<> a mf:Manifest ;
	rdfs:label "SPARQL 1.1 tests".
`);
    break;
  case 'http://validsub1':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<> a mf:Manifest ;
	rdfs:label "SPARQL 1.1 tests";
	mf:include (<http://valid1>).
`);
    break;
  case 'http://invalidroot':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<http://ex.org/abc> a mf:Manifest ;
	rdfs:label "SPARQL 1.1 tests";
	mf:include ("http://invalid1").
`);
    break;
  case 'http://invalidsub1':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<> a mf:Manifest ;
	rdfs:label "SPARQL 1.1 tests";
	mf:include ("http://invalid1").
`);
    break;
  default:
    body = streamifyString('ABC');
    break;
  }
  const headers = new Headers({ 'Content-Type': 'text/turtle' });
  return Promise.resolve(new Response(body, <any> { headers, status: 200, url }));
};

describe('ManifestLoader', () => {
  it('should be constructable without args', () => {
    return expect(new ManifestLoader()).toBeInstanceOf(ManifestLoader);
  });

  it('should be constructable with args', () => {
    return expect(new ManifestLoader({})).toBeInstanceOf(ManifestLoader);
  });

  describe('from', () => {
    let loader;

    beforeEach(() => {
      loader = new ManifestLoader();
    });

    it('should error on invalid manifests', () => {
      return expect(loader.from('error')).rejects.toBeTruthy();
    });

    it('should return a valid manifests', () => {
      return expect(loader.from('http://valid1')).resolves.toEqual({
        comment: null,
        label: 'SPARQL 1.1 tests',
        specifications: null,
        subManifests: [],
        testEntries: [],
        uri: 'http://valid1',
      });
    });

    it('should error on non-self describing documents', () => {
      return expect(loader.from('http://invalidroot')).rejects.toBeTruthy();
    });

    it('should return on valid submanifests', () => {
      return expect(loader.from('http://validsub1')).resolves.toEqual({
        comment: null,
        label: 'SPARQL 1.1 tests',
        specifications: null,
        subManifests: [
          {
            comment: null,
            label: 'SPARQL 1.1 tests',
            specifications: null,
            subManifests: [],
            testEntries: [],
            uri: 'http://valid1',
          },
        ],
        testEntries: [],
        uri: 'http://validsub1',
      });
    });

    it('should error on invalid submanifests', () => {
      return expect(loader.from('http://invalidsub1')).rejects.toBeTruthy();
    });
  });
});
