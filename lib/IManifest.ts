import {Resource} from "rdf-object";
import {ITestCase, testCaseFromResource} from "./testcase/ITestCase";
import {ITestCaseHandler} from "./testcase/ITestCaseHandler";
import {IFetchOptions, Util} from "./Util";

/**
 * A manifest data holder.
 */
export interface IManifest {
  uri: string;
  label?: string;
  comment?: string;
  subManifests?: IManifest[];
  testEntries?: ITestCase<any>[];
  specifications?: {[uri: string]: IManifest};
}

/**
 * Create a manifest object from a resource.
 * @param {{[uri: string]: ITestCaseHandler<ITestCase<any>>}} testCaseHandlers Handlers for constructing test cases.
 * @param {IFetchOptions} options The fetch options.
 * @param {Resource} resource A resource.
 * @return {Promise<IManifest>} A promise resolving to a manifest object.
 */
export async function manifestFromResource(testCaseHandlers: {[uri: string]: ITestCaseHandler<ITestCase<any>>},
                                           options: IFetchOptions, resource: Resource): Promise<IManifest> {
  return {
    comment: resource.property.comment ? resource.property.comment.value : null,
    label: resource.property.label ? resource.property.label.value : null,
    specifications: resource.property.specifications ? await Util.promiseValues<IManifest>(
      Object.assign.apply({}, await Promise.all(
        resource.property.specifications.list
          .map((specificationResource: Resource) =>
            ({ [specificationResource.term.value]:
                manifestFromSpecificationResource(testCaseHandlers, options, specificationResource) }))))) : null,
    subManifests: await Promise.all<IManifest>([].concat.apply([],
      resource.properties.include.map((includeList: Resource) => includeList.list
        .map(resource => manifestFromResource(testCaseHandlers, options, resource))))),
    testEntries: (await Promise.all<ITestCase<any>>([].concat.apply([],
      resource.properties.entries.map(
        (entryList: Resource) => (entryList.list || [entryList])
          .map(resource => testCaseFromResource(testCaseHandlers, options, resource))))))
      .filter((v) => v),
    uri: resource.value,
  };
}

/**
 * Create a manifest object from a specification resource.
 * @param {{[uri: string]: ITestCaseHandler<ITestCase<any>>}} testCaseHandlers Handlers for constructing test cases.
 * @param {IFetchOptions} options The fetch options.
 * @param {Resource} resource A resource.
 * @return {Promise<IManifest>} A promise resolving to a manifest object.
 */
export async function manifestFromSpecificationResource(testCaseHandlers: {[uri: string]:
                                                            ITestCaseHandler<ITestCase<any>>},
                                                        options: IFetchOptions,
                                                        resource: Resource): Promise<IManifest> {
  if (resource.property.conformanceRequirements) {
    const subManifests = await Promise.all<IManifest>(resource.property.conformanceRequirements.list
      .map(manifestFromResource.bind(null, testCaseHandlers, options)));
    return {
      comment: resource.property.comment ? resource.property.comment.value : null,
      label: resource.property.label ? resource.property.label.value : null,
      subManifests,
      uri: resource.value,
    };
  } else {
    return {
      comment: resource.property.comment ? resource.property.comment.value : null,
      label: resource.property.label ? resource.property.label.value : null,
      uri: resource.value,
    };
  }
}
