import {literal, namedNode} from "@rdfjs/data-model";
import {ContextParser} from "jsonld-context-parser";
import {Resource} from "rdf-object";
import {manifestFromResource} from "../lib/IManifest";

const handlers: any = {
  abc: {
    resourceToTestCase: (resource, data) => Promise.resolve({ ...data, test: true }),
  },
  error: {
    resourceToTestCase: () => Promise.reject(new Error('Test case handler error')),
  },
};

describe('IManifest', () => {

  let context;
  let pType;
  let pInclude;
  let pIncludeSpec;
  let pConformance;
  let pComment;
  let pLabel;
  let pEntries;

  beforeEach((done) => {
    new ContextParser().parse(require('../lib/context-manifest.json'))
      .then((parsedContext) => {
        context = parsedContext;

        pType = new Resource(
          { term: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), context });
        pInclude = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#include'), context });
        pIncludeSpec = new Resource(
          {
            context,
            term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#includedSpecifications'),
          });
        pConformance = new Resource(
          {
            context,
            term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#conformanceRequirement'),
          });
        pComment = new Resource(
          { term: namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), context });
        pLabel = new Resource(
          { term: namedNode('http://www.w3.org/2000/01/rdf-schema#label'), context });
        pEntries = new Resource(
          { term: namedNode('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#entries'), context });

        done();
      });
  });

  describe('#manifestFromResource', () => {
    it('should return a manifest without optional properties', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: null,
        label: null,
        specifications: null,
        subManifests: [],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with sub manifests', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const resourceIncludeList = new Resource({ term: namedNode('resourceIncludeList'), context });
      resourceIncludeList.list = [
        new Resource({ term: namedNode('http://example.org/m2'), context }),
        new Resource({ term: namedNode('http://example.org/m3'), context }),
      ];
      resource.addProperty(pInclude, resourceIncludeList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: null,
        subManifests: [
          {
            comment: null,
            label: null,
            specifications: null,
            subManifests: [],
            testEntries: [],
            uri: 'http://example.org/m2',
          },
          {
            comment: null,
            label: null,
            specifications: null,
            subManifests: [],
            testEntries: [],
            uri: 'http://example.org/m3',
          },
        ],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with empty specifications without optional fields', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const spec1 = new Resource({ term: namedNode('http://example.org/spec1'), context });
      const spec2 = new Resource({ term: namedNode('http://example.org/spec2'), context });
      const resourceIncludeSpecList = new Resource({ term: namedNode('resourceIncludeList'), context });
      resourceIncludeSpecList.list = [
        spec1,
        spec2,
      ];
      resource.addProperty(pIncludeSpec, resourceIncludeSpecList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: {
          'http://example.org/spec1': {
            comment: null,
            label: null,
            uri: 'http://example.org/spec1',
          },
          'http://example.org/spec2': {
            comment: null,
            label: null,
            uri: 'http://example.org/spec2',
          },
        },
        subManifests: [],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with empty specifications with optional fields', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const spec1 = new Resource({ term: namedNode('http://example.org/spec1'), context });
      const spec2 = new Resource({ term: namedNode('http://example.org/spec2'), context });
      spec1.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      spec1.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));
      spec2.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      spec2.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));
      const resourceIncludeSpecList = new Resource({ term: namedNode('resourceIncludeList'), context });
      resourceIncludeSpecList.list = [
        spec1,
        spec2,
      ];
      resource.addProperty(pIncludeSpec, resourceIncludeSpecList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: {
          'http://example.org/spec1': {
            comment: 'COMMENT',
            label: 'LABEL',
            uri: 'http://example.org/spec1',
          },
          'http://example.org/spec2': {
            comment: 'COMMENT',
            label: 'LABEL',
            uri: 'http://example.org/spec2',
          },
        },
        subManifests: [],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with non-empty specifications without optional fields', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const spec1 = new Resource({ term: namedNode('http://example.org/spec1'), context });
      const spec1Sub = new Resource({ term: namedNode('http://example.org/spec1sub'), context });
      spec1Sub.list = [
        new Resource({ term: namedNode('http://example.org/spec1m1'), context }),
        new Resource({ term: namedNode('http://example.org/spec1m2'), context }),
      ];
      spec1.addProperty(pConformance, spec1Sub);
      const spec2 = new Resource({ term: namedNode('http://example.org/spec2'), context });
      const spec2Sub = new Resource({ term: namedNode('http://example.org/spec2sub'), context });
      spec2Sub.list = [
        new Resource({ term: namedNode('http://example.org/spec2m1'), context }),
        new Resource({ term: namedNode('http://example.org/spec2m2'), context }),
      ];
      spec2.addProperty(pConformance, spec2Sub);
      const resourceIncludeSpecList = new Resource({ term: namedNode('resourceIncludeList'), context });
      resourceIncludeSpecList.list = [
        spec1,
        spec2,
      ];
      resource.addProperty(pIncludeSpec, resourceIncludeSpecList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: {
          'http://example.org/spec1': {
            comment: null,
            label: null,
            subManifests: [
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec1m1',
              },
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec1m2',
              },
            ],
            uri: 'http://example.org/spec1',
          },
          'http://example.org/spec2': {
            comment: null,
            label: null,
            subManifests: [
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec2m1',
              },
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec2m2',
              },
            ],
            uri: 'http://example.org/spec2',
          },
        },
        subManifests: [],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with non-empty specifications with optional fields', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const spec1 = new Resource({ term: namedNode('http://example.org/spec1'), context });
      const spec1Sub = new Resource({ term: namedNode('http://example.org/spec1sub'), context });
      spec1.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      spec1.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));
      spec1Sub.list = [
        new Resource({ term: namedNode('http://example.org/spec1m1'), context }),
        new Resource({ term: namedNode('http://example.org/spec1m2'), context }),
      ];
      spec1.addProperty(pConformance, spec1Sub);
      const spec2 = new Resource({ term: namedNode('http://example.org/spec2'), context });
      spec2.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      spec2.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));
      const spec2Sub = new Resource({ term: namedNode('http://example.org/spec2sub'), context });
      spec2Sub.list = [
        new Resource({ term: namedNode('http://example.org/spec2m1'), context }),
        new Resource({ term: namedNode('http://example.org/spec2m2'), context }),
      ];
      spec2.addProperty(pConformance, spec2Sub);
      const resourceIncludeSpecList = new Resource({ term: namedNode('resourceIncludeList'), context });
      resourceIncludeSpecList.list = [
        spec1,
        spec2,
      ];
      resource.addProperty(pIncludeSpec, resourceIncludeSpecList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: {
          'http://example.org/spec1': {
            comment: 'COMMENT',
            label: 'LABEL',
            subManifests: [
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec1m1',
              },
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec1m2',
              },
            ],
            uri: 'http://example.org/spec1',
          },
          'http://example.org/spec2': {
            comment: 'COMMENT',
            label: 'LABEL',
            subManifests: [
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec2m1',
              },
              {
                comment: null,
                label: null,
                specifications: null,
                subManifests: [],
                testEntries: [],
                uri: 'http://example.org/spec2m2',
              },
            ],
            uri: 'http://example.org/spec2',
          },
        },
        subManifests: [],
        testEntries: [],
        uri: 'http://example.org/m1',
      });
    });

    it('should return a manifest with tests', async () => {
      const resource = new Resource({ term: namedNode('http://example.org/m1'), context });
      resource.addProperty(pComment, new Resource({ term: literal('COMMENT'), context}));
      resource.addProperty(pLabel, new Resource({ term: literal('LABEL'), context}));

      const test1 = new Resource({ term: namedNode('http://example.org/test1'), context });
      test1.addProperty(pType, new Resource({ term: namedNode('abc'), context}));
      const test2 = new Resource({ term: namedNode('http://example.org/test2'), context });
      test2.addProperty(pType, new Resource({ term: namedNode('abc'), context}));

      const testList = new Resource({ term: namedNode('testList'), context });
      testList.list = [
        test1,
        test2,
      ];
      resource.addProperty(pEntries, testList);

      return expect(await manifestFromResource(handlers, null, resource)).toEqual({
        comment: 'COMMENT',
        label: 'LABEL',
        specifications: null,
        subManifests: [],
        testEntries: [
          {
            approval: null,
            approvedBy: null,
            comment: null,
            name: null,
            test: true,
            types: [ 'abc' ],
            uri: 'http://example.org/test1',
          },
          {
            approval: null,
            approvedBy: null,
            comment: null,
            name: null,
            test: true,
            types: [ 'abc' ],
            uri: 'http://example.org/test2',
          }
        ],
        uri: 'http://example.org/m1',
      });
    });
  });
});
