import {ITestCase} from "../ITestCase";
import {IParser} from "./IParser";
import {ISerializer} from "./ISerializer";

/**
 * An test case data holder for serializations from RDF syntax.
 */
export interface ITestCaseFromRdfSyntax extends ITestCase<ISerializer> {
  type: 'fromrdfsyntax';
}
