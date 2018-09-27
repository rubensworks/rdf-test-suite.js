import * as LogSymbols from "log-symbols";
import * as RDF from "rdf-js";
import {IManifest} from "./IManifest";
import {ManifestLoader} from "./ManifestLoader";
import {ITestCase} from "./testcase/ITestCase";
import WriteStream = NodeJS.WriteStream;

/**
 * TestSuiteRunner runs a certain test suite manifest.
 */
export class TestSuiteRunner {

  /**
   * Run the manifest with the given URL.
   * @param {string} manifestUrl The URL of a manifest.
   * @param handler The handler to run the tests with.
   * @param {string} cachePath The base directory to cache files in. If falsy, then no cache will be used.
   * @param {string} specification An optional specification to scope the manifest tests by.
   * @return {Promise<ITestResult[]>} A promise resolving to an array of test results.
   */
  public async runManifest(manifestUrl: string, handler: any,
                           cachePath: string, specification?: string): Promise<ITestResult[]> {
    const manifest: IManifest = await new ManifestLoader().from(manifestUrl, cachePath);
    const results: ITestResult[] = [];

    // Only run the tests for the given specification if one was defined.
    if (specification) {
      if (!manifest.specifications || !manifest.specifications[specification]) {
        return [];
      }
      await this.runManifestConcrete(manifest.specifications[specification], handler, results);
      return results;
    }

    await this.runManifestConcrete(manifest, handler, results);
    return results;
  }

  /**
   * Run the given manifest.
   * @param {string} manifest A manifest.
   * @param handler The handler to run the tests with.
   * @param {ITestResult[]} results An array to append the test results to
   * @return {Promise<void>} A promise resolving when the tests are finished.
   */
  public async runManifestConcrete(manifest: IManifest, handler: any, results: ITestResult[]) {
    // Execute all tests in this manifest
    if (manifest.testEntries) {
      for (const test of manifest.testEntries) {
        try {
          await test.test(handler);
        } catch (error) {
          results.push({ test, ok: false, error });
          continue;
        }
        results.push({ test, ok: true });
      }
    }

    // Recursively handle all sub-manifests
    if (manifest.subManifests) {
      for (const subManifest of manifest.subManifests) {
        await (this.runManifestConcrete(subManifest, handler, results));
      }
    }
  }

  /**
   * Print the given test results to a text stream.
   * @param {WriteStream} stdout The output stream to write to.
   * @param {ITestResult[]} results An array of test results.
   * @param {boolean} compact If the results should be printed in compact-mode.
   */
  public resultsToText(stdout: WriteStream, results: ITestResult[], compact: boolean) {
    const failedTests: ITestResult[] = [];
    let success: number = 0;
    for (const result of results) {
      if (result.ok) {
        success++;
        stdout.write(`${LogSymbols.success} ${result.test.name} (${result.test.uri})\n`);
      } else {
        failedTests.push(result);
        stdout.write(`${LogSymbols.error} ${result.test.name} (${result.test.uri})\n`);
      }
    }

    if (!compact) {
      for (const result of failedTests) {
        stdout.write(`
${LogSymbols.error} ${result.test.name}
  ${result.test.comment || ''}
  ${result.error}
  More info: ${result.test.uri}

`);
      }
    }

    if (success === results.length) {
      stdout.write(`${LogSymbols.success} ${success} / ${results.length} tests succeeded!\n`);
    } else {
      stdout.write(`${LogSymbols.error} ${success} / ${results.length} tests succeeded!\n`);
    }
  }

  /**
   * Convert test results to an RDF stream.
   * @param {ITestResult[]} results Test results.
   * @return {Stream} An RDF stream of quads.
   */
  public resultsToEarl(results: ITestResult[]): RDF.Stream {
    return null;
  }

}

export interface ITestResult {
  test: ITestCase<any>;
  ok: boolean;
  error?: Error;
}
