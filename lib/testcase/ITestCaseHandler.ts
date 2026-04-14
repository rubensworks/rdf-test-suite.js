import type { Resource } from 'rdf-object';
import type { IFetchOptions } from '../Util';
import type { ITestCase, ITestCaseData } from './ITestCase';

/**
 * An ITestCaseHandler interprets a test case resource and constructs test cases.
 */
export interface ITestCaseHandler<T extends ITestCase<any>> {
  resourceToTestCase: (resource: Resource, testCaseData: ITestCaseData, options?: IFetchOptions) => Promise<T>;
}
