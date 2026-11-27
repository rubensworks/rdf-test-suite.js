import type { RdfObjectLoader, Resource } from 'rdf-object';
import type { ITestCase } from './testcase/ITestCase';
import { testCaseFromResource } from './testcase/ITestCase';
import type { ITestCaseHandler } from './testcase/ITestCaseHandler';
import type { IFetchOptions } from './Util';
import { Util } from './Util';

/**
 * Options for loading a manifest and its test cases.
 */
export interface IManifestLoadOptions extends IFetchOptions {
  /**
   * If tests that can not be loaded, for instance because one of their files could not be fetched,
   * should fail instead of being left out. Defaults to false.
   */
  failUnloadableTests?: boolean;
}

/**
 * A manifest data holder.
 */
export interface IManifest {
  uri: string;
  label?: string;
  comment?: string;
  subManifests?: IManifest[];
  testEntries?: ITestCase<any>[];
  specifications?: Record<string, IManifest>;
}

/**
 * Create a manifest object from a resource.
 * @param {{[uri: string]: ITestCaseHandler<ITestCase<any>>}} testCaseHandlers Handlers for constructing test cases.
 * @param {IManifestLoadOptions} options The load options.
 * @param {Resource} resource A resource.
 * @return {Promise<IManifest>} A promise resolving to a manifest object.
 */
export async function manifestFromResource(testCaseHandlers: Record<string, ITestCaseHandler<ITestCase<any>>>, options: IManifestLoadOptions, resource: Resource, objectLoader: RdfObjectLoader): Promise<IManifest> {
  return {
    comment: resource.property.comment ? resource.property.comment.value : null,
    label: resource.property.label ? resource.property.label.value : null,
    specifications: resource.property.specifications ?
      await Util.promiseValues<IManifest>(
        Object.assign.apply({}, <any> await Promise.all(
          resource.property.specifications.list
            .map((specificationResource: Resource) =>
              ({ [specificationResource.term.value]:
                manifestFromSpecificationResource(testCaseHandlers, options, specificationResource, objectLoader) })),
        )),
      ) :
      null,
    subManifests: await Promise.all<IManifest>(
      // This is here because of the way the rdf-star test suite is published
      // @see https://github.com/rubensworks/rdf-test-suite.js/pull/78/files#r1026326410
      (<any> ((resource.properties.include.length > 0 || !objectLoader) ?
        resource :
          (objectLoader.resources?.[resource.value.slice(0, resource.value.lastIndexOf('.')).replace(/\/manifest$/u, '#manifest')] ?? resource)
      )
        .properties.include.flatMap(
          (includeList: Resource) => includeList.list.map(res => manifestFromResource(testCaseHandlers, options, res, objectLoader)),
        )
      ),
    ),
    testEntries: (await Promise.all<ITestCase<any>>(
      // This is here because of the way the rdf-star test suite is published
      // @see https://github.com/rubensworks/rdf-test-suite.js/pull/78/files#r1026326410
      (<any> (
        (resource.properties.entries.length > 0 || !objectLoader) ?
          resource :
            (objectLoader.resources?.[resource.value.slice(0, resource.value.lastIndexOf('.')).replace(/\/manifest$/u, '#manifest')] ?? resource)
      ).properties.entries.flatMap(
        (entryList: Resource) => (entryList.list || [ entryList ])
          .map(res => testCaseFromResource(testCaseHandlers, options, res, true)),
      )),
    ))
      .filter(Boolean)
      .flat(),
    uri: resource.value,
  };
}

/**
 * Create a manifest object from a specification resource.
 * @param {{[uri: string]: ITestCaseHandler<ITestCase<any>>}} testCaseHandlers Handlers for constructing test cases.
 * @param {IManifestLoadOptions} options The load options.
 * @param {Resource} resource A resource.
 * @return {Promise<IManifest>} A promise resolving to a manifest object.
 */
export async function manifestFromSpecificationResource(testCaseHandlers: Record<string, ITestCaseHandler<ITestCase<any>>>, options: IManifestLoadOptions, resource: Resource, objectLoader: RdfObjectLoader): Promise<IManifest> {
  if (resource.property.conformanceRequirements) {
    const subManifests = await Promise.all<IManifest>(resource.property.conformanceRequirements.list
      .map(resource => manifestFromResource(testCaseHandlers, options, resource, objectLoader)));
    return {
      comment: resource.property.comment ? resource.property.comment.value : null,
      label: resource.property.label ? resource.property.label.value : null,
      subManifests,
      uri: resource.value,
    };
  }
  return {
    comment: resource.property.comment ? resource.property.comment.value : null,
    label: resource.property.label ? resource.property.label.value : null,
    uri: resource.value,
  };
}
