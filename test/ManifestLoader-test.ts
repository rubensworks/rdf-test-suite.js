import * as fs from 'node:fs';
import * as path from 'node:path';
import { ManifestLoader } from '../lib/ManifestLoader';

const streamifyString = require('streamify-string');

// Mock fetch
(<any> globalThis).fetch = (urlRequested: string) => {
  // Real fetch() implementations never send fragments to the server.
  // Instead, the report the fragment-less URL as `response.url`
  // (which may also differ from the requested URL entirely in case of a redirect).
  // We emulate both here: `url` is what was actually fetched/reported,
  // defaulting to the (fragment-stripped) requested URL,
  // but overridable per case below to simulate a redirect to a different URL.
  const hashPos = urlRequested.indexOf('#');
  let url = hashPos >= 0 ? urlRequested.slice(0, hashPos) : urlRequested;

  let body;
  switch (url) {
    case 'http://valid1':
      body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<> a mf:Manifest ;
  rdfs:label "SPARQL 1.1 tests".
`);
      break;
    case 'http://valid1.txt':
      body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<http://valid1> a mf:Manifest ;
  rdfs:label "SPARQL 1.1 tests".
`);
      break;
    case 'http://valid1/with/slash/manifest.jsonld':
      body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<http://valid1/with/slash#manifest> a mf:Manifest ;
  rdfs:label "SPARQL 1.1 tests".
`);
      break;
    case 'http://validsub1':
      body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
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
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
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
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<> a mf:Manifest ;
  rdfs:label "SPARQL 1.1 tests";
  mf:include ("http://invalid1").
`);
      break;
    case 'https://example.org/jena/Lateral/manifest.ttl':
      // Simulate an HTTP redirect: the requested URL is on one domain, but the document is
      // actually served from (and reports response.url as) a different one. The manifest
      // resource is declared with an absolute IRI on the *redirected-to* domain, so it can
      // only be found by resolving the caller's fragment against the truly-fetched URL — not
      // against the originally-requested URL, and not by accident via the pre-existing
      // "same as document URL" heuristic (which has no fragment at all).
      url = 'https://cdn.example.org/real/Lateral/manifest.ttl';
      body = streamifyString(`
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix mf:     <http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#> .
@prefix qt:     <http://www.w3.org/2001/sw/DataAccess/tests/test-query#> .

<https://cdn.example.org/real/Lateral/manifest.ttl#manifest> a mf:Manifest ;
  rdfs:label "Jena Lateral tests".
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
  const response = new Response(body, { headers, status: 200 });
  Object.defineProperty(response, 'url', { value: url });
  return Promise.resolve(response);
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

    it('should error on invalid manifests', async() => {
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

    it('should honor an explicit fragment IRI (Jena-style <#manifest>), resolved against the final (redirected) URL', () => {
      // The document lives at https://cdn.example.org/... (see the mock above),
      // not at the originally-requested https://example.org/... URL.
      // This can only resolve correctly if the fragment is resolved against
      // the URL that was *actually* fetched (where it lives).
      return expect(loader.from('https://example.org/jena/Lateral/manifest.ttl#manifest')).resolves.toEqual({
        comment: null,
        label: 'Jena Lateral tests',
        specifications: null,
        subManifests: [],
        testEntries: [],
        uri: 'https://cdn.example.org/real/Lateral/manifest.ttl#manifest',
      });
    });

    it('should load sub-manifests for the RDF-star test suite', async() => {
      const load = await loader.from('https://w3c.github.io/rdf-star/tests/manifest.jsonld');

      expect(load).toMatchObject({
        comment: null,
        label: 'RDF-star test suite',
        specifications: null,
        uri: 'https://w3c.github.io/rdf-star/tests#manifest',
      });

      expect(
        load.subManifests.map(elem => elem.testEntries),
      ).toHaveLength(8);
    });

    it('should error on invalid submanifests', () => {
      return expect(loader.from('http://invalidsub1')).rejects.toBeTruthy();
    });
  });
});
