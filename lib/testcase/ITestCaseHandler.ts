import {Resource} from "rdf-object";
import {ITestCase, ITestCaseData} from "./ITestCase";

/**
 * An ITestCaseHandler interprets a test case resource and constructs test cases.
 */
export interface ITestCaseHandler<T extends ITestCase<any>> {
  resourceToTestCase(resource: Resource, testCaseData: ITestCaseData, cachePath?: string): Promise<T>;
}
