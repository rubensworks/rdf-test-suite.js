import * as RDF from "@rdfjs/types";
import { ITestCaseRdfSyntax } from "./ITestCaseRdfSyntax";

/**
 * A parser handler.
 */
export interface IParser {
  parse(data: string, baseIRI: string, options: {[key: string]: any}, testCase?: ITestCaseRdfSyntax): Promise<RDF.Quad[]>;
}
