import {ManifestLoader} from "../lib/ManifestLoader";
import * as fs from 'fs';
import * as path from 'path';
import { IManifest } from "../lib/IManifest";

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
  case 'http://valid1.txt':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<http://valid1> a mf:Manifest ;
	rdfs:label "SPARQL 1.1 tests".
`);
    break;
  case 'http://valid1/with/slash/manifest.jsonld':
    body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:	<http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<http://valid1/with/slash#manifest> a mf:Manifest ;
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
  case 'https://w3c.github.io/rdf-star/tests/manifest.jsonld':
      body = streamifyString(`
      ## [1] https://www.w3.org/Consortium/Legal/2008/04-testsuite-license
      ## [2] https://www.w3.org/Consortium/Legal/2008/03-bsd-license
      
      PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#>
      PREFIX rdft:   <http://www.w3.org/ns/rdftest#>
      PREFIX trs:    <https://w3c.github.io/rdf-star/tests#>
      PREFIX dct:    <http://purl.org/dc/terms/>
      PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>
      PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
      PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
      
      trs:manifest  rdf:type mf:Manifest ;
        rdfs:label "RDF-star test suite"@en ;
        skos:prefLabel "La suite des tests pour RDF-star"@fr;
        skos:prefLabel "Conjunto de pruebas para RDF-star"@es;
        dct:issued "2021-06-21"^^xsd:date ;
        rdfs:seeAlso <https://w3c.github.io/rdf-tests/> ;
        dct:modified "2021-07-18"^^xsd:date ;
        dct:licence <https://www.w3.org/Consortium/Legal/2008/03-bsd-license> ;
        dct:creator [ foaf:homepage <https://w3c.github.io/rdf-star/> ; foaf:name " RDF-star Interest Group within the W3C RDF-DEV Community Group" ] ;
          mf:include (
            <nt/syntax/manifest.ttl>
            <semantics/manifest.ttl>
            <sparql/eval/manifest.ttl>
            <sparql/syntax/manifest.ttl>
            <trig/eval/manifest.ttl>
            <trig/syntax/manifest.ttl>
            <turtle/eval/manifest.ttl>
            <turtle/syntax/manifest.ttl>
          ) .
      `);
    break;
    case 'https://w3c.github.io/rdf-star/tests/turtle/syntax/manifest.ttl':
      body = streamifyString(fs.readFileSync(path.join(__dirname, 'assets', 'sample_manifest.ttl')).toString());
    break;
  default: {
    if (url.startsWith('https://w3c.github.io/rdf-star/')) {
      body = streamifyString(`<${url}> a <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#Manifest> .`);
    } else {
      body = streamifyString('ABC');
    }
    break;
  }
  }
  const headers = new Headers({ 'Content-Type': 'text/turtle' });
  return Promise.resolve(new Response(body, <any> { headers, status: 200 }));
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

    it('should error on invalid manifests', async () => {
      return await expect(loader.from('error')).rejects.toThrow(new Error('Unexpected "ABC" on line 1.'));
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

    it('should return a valid manifests that falls back to the extension-less URL', () => {
      return expect(loader.from('http://valid1.txt')).resolves.toEqual({
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

    it('should apply / => # conversion required by RDF-star test suite', () => {
      return expect(loader.from('http://valid1/with/slash/manifest.jsonld')).resolves.toEqual({
        comment: null,
        label: 'SPARQL 1.1 tests',
        specifications: null,
        subManifests: [],
        testEntries: [],
        uri: 'http://valid1/with/slash#manifest',
      });
    });

    it('should load sub-manifests for the RDF-star test suite', async () => {
      const load = await loader.from('https://w3c.github.io/rdf-star/tests/manifest.jsonld');

      expect(load).toMatchObject({
        comment: null,
        label: 'RDF-star test suite',
        specifications: null,
        uri: 'https://w3c.github.io/rdf-star/tests#manifest',
      });

      expect(
        load.subManifests
          .find((manifest: IManifest) => manifest.uri === 'https://w3c.github.io/rdf-star/tests/turtle/syntax#manifest')
          .testEntries
      ).toHaveLength(35);
    });

    it('should error on invalid submanifests', () => {
      return expect(loader.from('http://invalidsub1')).rejects.toBeTruthy();
    });
  });
});
