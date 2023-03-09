import {Resource} from "rdf-object";
import {termToString} from "rdf-string";
import {IFetchOptions} from "../Util";
import {ITestCaseHandler} from "./ITestCaseHandler";
import { ITestResultOverride } from '../TestSuiteRunner';

export interface ITestCaseData {
  uri: string;
  types: string[];
  name: string;
  comment: string;
  approval: string;
  approvedBy: string;
}

/**
 * A test case data holder.
 */
export interface ITestCase<H> extends ITestCaseData {
  type: string;
  test(handler: H, injectArguments: any): Promise<void | ITestResultOverride>;
}

/**
 * Create a test case object from a resource.
 * @param {{[uri: string]: ITestCaseHandler<ITestCase<any>>}} testCaseHandlers Handlers for constructing test cases.
 * @param {string} cachePath The base directory to cache files in. If falsy, then no cache will be used.
 * @param {Resource} resource A resource.
 * @return {Promise<ITestCase<any>>} A promise resolving to a test case object.
 */
export async function testCaseFromResource(testCaseHandlers: {[uri: string]: ITestCaseHandler<ITestCase<any>>},
                                           options: IFetchOptions, resource: Resource): Promise<ITestCase<any>> {
  const baseTestCase: ITestCaseData = {
    approval: resource.property.approval ? resource.property.approval.value : (resource.property.rdftApproval ? resource.property.rdftApproval.value : null),
    approvedBy: resource.property.approvedBy ? resource.property.approvedBy.value : null,
    comment: resource.property.comment ? resource.property.comment.value : null,
    name: resource.property.name ? resource.property.name.value : null,
    types: resource.properties.types.map((r) => termToString(r.term)),
    uri: resource.term.value,
  };

  if (!baseTestCase.types.length) {
    // Ignore undefined test cases, this is applicable in the official test cases,
    // like http://www.w3.org/2009/sparql/docs/tests/data-sparql11/http-rdf-update/manifest#put__empty_graph
    return null;
  }

  // Find the first handler that has all its required types in the given test case
  let handler: ITestCaseHandler<ITestCase<any>>;
  for (const testCaseHandlerKey in testCaseHandlers) {
    const testCaseHandlerTypes: string[] = testCaseHandlerKey.split(' ');
    const availableTypes = resource.properties.types.map((term) => term.value);
    let valid: boolean = true;
    for (const testCaseHandlerType of testCaseHandlerTypes) {
      if (availableTypes.indexOf(testCaseHandlerType) < 0) {
        valid = false;
        break;
      }
    }
    if (valid) {
      handler = testCaseHandlers[testCaseHandlerKey];
      break;
    }
  }

  if (!handler) {
    // tslint:disable-next-line:no-console
    console.error(new Error(
      `Could not find a test case handler for ${resource.value} with types ${baseTestCase.types}`).toString());
    return null;
  }

  try {
    return await handler.resourceToTestCase(resource, baseTestCase, options);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error(e.toString());
    return null;
  }
}
