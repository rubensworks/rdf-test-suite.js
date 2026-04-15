import type { Resource } from 'rdf-object';
import { termToString } from 'rdf-string';
import type { ITestResultOverride } from '../TestSuiteRunner';
import type { IFetchOptions } from '../Util';
import type { ITestCaseHandler } from './ITestCaseHandler';

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
 * @param options Fetch options.
 * @param {Resource} resource A resource.
 * @param allowMultiple Whether to allow multiple test cases.
 * @return {Promise<ITestCase<any>>} A promise resolving to a test case object.
 */
export async function testCaseFromResource(testCaseHandlers: Record<string, ITestCaseHandler<ITestCase<any>>>, options: IFetchOptions, resource: Resource, allowMultiple = false): Promise<ITestCase<any> | ITestCase<any>[] | null> {
  const baseTestCase: ITestCaseData = {
    approval: resource.property.approval ? resource.property.approval.value : (resource.property.rdftApproval ? resource.property.rdftApproval.value : null),
    approvedBy: resource.property.approvedBy ? resource.property.approvedBy.value : null,
    comment: resource.property.comment ? resource.property.comment.value : null,
    name: resource.property.name ? resource.property.name.value : null,
    types: resource.properties.types.map(r => termToString(r.term)),
    uri: resource.term.value,
  };

  const empty: null | never[] = allowMultiple ? [] : null;

  if (resource.properties.types.length === 0) {
    // Ignore undefined test cases, this is applicable in the official test cases,
    // like http://www.w3.org/2009/sparql/docs/tests/data-sparql11/http-rdf-update/manifest#put__empty_graph
    return empty;
  }

  const handlers: [string, ITestCaseHandler<ITestCase<any>>][] = [];
  const availableTypes = new Set(resource.properties.types.map(term => term.value));
  for (const [ key, handler ] of Object.entries(testCaseHandlers)) {
    if (key.split(' ').every(type => availableTypes.has(type))) {
      handlers.push([ key, handler ]);
    }
  }

  if (handlers.length === 0) {
    // eslint-disable-next-line no-console
    console.error(new Error(
      `Could not find a test case handler for ${resource.value} with types ${baseTestCase.types}`,
    ).toString());
    return empty;
  }

  try {
    const res = (await Promise.all(handlers.map(([ key, handler ]) => handler.resourceToTestCase(resource, {
      ...baseTestCase,
      types: key.split(' '),
    }, options)))).filter(Boolean);
    return allowMultiple ? res : res[0];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e.toString());
    return empty;
  }
}
