import {literal, namedNode, triple} from "@rdfjs/data-model";
import * as LogSymbols from "log-symbols";
import * as RDF from "rdf-js";
import {IManifest} from "./IManifest";
import {ManifestLoader} from "./ManifestLoader";
import {ITestCase} from "./testcase/ITestCase";
import WriteStream = NodeJS.WriteStream;
import {Util} from "./Util";
// tslint:disable:no-var-requires
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

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
   * @param {RegExp} testRegex An optional regex to filter test IRIs by.
   * @return {Promise<ITestResult[]>} A promise resolving to an array of test results.
   */
  public async runManifest(manifestUrl: string, handler: any,
                           cachePath: string, specification?: string,
                           testRegex?: RegExp): Promise<ITestResult[]> {
    const manifest: IManifest = await new ManifestLoader().from(manifestUrl, cachePath);
    const results: ITestResult[] = [];

    // Only run the tests for the given specification if one was defined.
    if (specification) {
      if (!manifest.specifications || !manifest.specifications[specification]) {
        return [];
      }
      await this.runManifestConcrete(manifest.specifications[specification], handler, testRegex, results);
      return results;
    }

    await this.runManifestConcrete(manifest, handler, testRegex, results);
    return results;
  }

  /**
   * Run the given manifest.
   * @param {string} manifest A manifest.
   * @param handler The handler to run the tests with.
   * @param {RegExp} testRegex An optional regex to filter test IRIs by.
   * @param {ITestResult[]} results An array to append the test results to
   * @return {Promise<void>} A promise resolving when the tests are finished.
   */
  public async runManifestConcrete(manifest: IManifest, handler: any, testRegex: RegExp, results: ITestResult[]) {
    // Execute all tests in this manifest
    if (manifest.testEntries) {
      for (const test of manifest.testEntries) {
        if (!testRegex || testRegex.test(test.uri)) {
          try {
            await test.test(handler);
          } catch (error) {
            results.push({ test, ok: false, error });
            continue;
          }
          results.push({ test, ok: true });
        }
      }
    }

    // Recursively handle all sub-manifests
    if (manifest.subManifests) {
      for (const subManifest of manifest.subManifests) {
        await (this.runManifestConcrete(subManifest, handler, testRegex, results));
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
   * @param {IEarlProperties} properties EARL properties.
   * @param {Date} testDate The date at which the tests were executed.
   * @return {Stream} An RDF stream of quads.
   */
  public resultsToEarl(results: ITestResult[], properties: IEarlProperties, testDate: Date): RDF.Stream {
    const p = require('./prefixes.json');
    const dateRaw = testDate.toISOString();
    const date = '"' + dateRaw + '"^^' + p.xsd + 'dateTime';
    const quads: RDF.Quad[] = [];

    // Describe report
    const report = properties.reportUri || '';
    quads.push(triple(namedNode(report), namedNode(p.foaf + 'primaryTopic'), namedNode(properties.applicationUri)));
    quads.push(triple(namedNode(report), namedNode(p.dc + 'issued'), literal(testDate.toISOString(),
      namedNode(p.xsd + 'dateTime'))));
    for (const author of properties.authors) {
      quads.push(triple(namedNode(report), namedNode(p.foaf + 'maker'), namedNode(author.uri)));
    }

    // Describe application
    const app = properties.applicationUri;
    quads.push(quad(app, p.rdf  + 'type', p.earl + 'Software'));
    quads.push(quad(app, p.rdf  + 'type', p.earl + 'TestSubject'));
    quads.push(quad(app, p.rdf  + 'type', p.doap + 'Project'));
    quads.push(quad(app, p.doap + 'name', '"' + properties.applicationNameFull + '"'));
    quads.push(quad(app, p.dc   + 'title', '"' + properties.applicationNameFull + '"'));
    quads.push(quad(app, p.doap + 'homepage', properties.applicationHomepageUrl));
    quads.push(quad(app, p.doap + 'license', properties.licenseUri));
    quads.push(quad(app, p.doap + 'programming-language', '"JavaScript"'));
    for (const spec of properties.specificationUris) {
      quads.push(quad(app, p.doap + 'implements', spec));
    }
    quads.push(quad(app, p.doap + 'category', 'http://dbpedia.org/resource/Resource_Description_Framework'));
    quads.push(quad(app, p.doap + 'download-page', 'https://npmjs.org/package/' + properties.applicationNameNpm));
    if (properties.applicationBugsUrl) {
      quads.push(quad(app, p.doap + 'bug-database', properties.applicationBugsUrl));
    }
    if (properties.applicationBlogUrl) {
      quads.push(quad(app, p.doap + 'blog', properties.applicationBlogUrl));
    }
    for (const author of properties.authors) {
      quads.push(quad(app, p.doap + 'developer', author.uri));
      quads.push(quad(app, p.doap + 'maintainer', author.uri));
      quads.push(quad(app, p.doap + 'documenter', author.uri));
      quads.push(quad(app, p.doap + 'maker', author.uri));
      quads.push(quad(app, p.dc   + 'creator', author.uri));
    }
    quads.push(quad(app, p.dc   + 'description', '"' + properties.applicationDescription + '"@en'));
    quads.push(quad(app, p.doap + 'description', '"' + properties.applicationDescription + '"@en'));

    // Describe authors
    for (const author of properties.authors) {
      quads.push(quad(author.uri, p.rdf  + 'type', p.foaf + 'Person'));
      quads.push(quad(author.uri, p.rdf  + 'type', p.earl + 'Assertor'));
      quads.push(quad(author.uri, p.foaf + 'name', '"' + author.name + '"'));
      quads.push(quad(author.uri, p.foaf + 'homepage', author.homepage));
      if (author.primaryTopic) {
        quads.push(quad(author.uri, p.foaf + 'primaryTopicOf', author.primaryTopic));
      }
    }

    // Describe test results
    let id = 0;
    for (const result of results) {
      const testUri = result.test.uri;
      quads.push(quad(testUri, p.rdf + 'type', p.earl + 'TestCriterion'));
      quads.push(quad(testUri, p.rdf + 'type', p.earl + 'TestCase'));
      quads.push(quad(testUri, p.dc + 'title', '"' + result.test.name + '"'));
      if (result.test.comment) {
        quads.push(quad(testUri, p.dc + 'description', '"' + result.test.comment + '"'));
      }
      quads.push(quad(testUri, p.earl + 'assertions', '_:assertions' + id));
      quads.push(quad('_:assertions' + id, p.rdf + 'first', '_:assertion' + id));
      quads.push(quad('_:assertions' + id, p.rdf + 'rest', p.rdf + 'nil'));
      quads.push(quad('_:assertion' + id, p.rdf + 'type', p.earl + 'Assertion'));
      for (const author of properties.authors) {
        quads.push(quad('_:assertion' + id, p.earl + 'assertedBy', author.uri));
      }
      quads.push(quad('_:assertion' + id, p.earl + 'test', testUri));
      quads.push(quad('_:assertion' + id, p.earl + 'subject', app));
      quads.push(quad('_:assertion' + id, p.earl + 'mode', p.earl + 'automatic'));
      quads.push(quad('_:assertion' + id, p.earl + 'result', '_:result' + id));
      quads.push(quad('_:result' + id, p.rdf + 'type', p.earl + 'TestResult'));
      quads.push(quad('_:result' + id, p.earl + 'outcome', p.earl + (result.ok ? 'passed' : 'failed')));
      quads.push(quad('_:result' + id, p.dc + 'date', date));
      id++;
    }

    return streamifyArray(quads);
  }

  /**
   * Create an {#link IEarlProperties} data object based on package.json contents.
   * @param packageJson Package.json contents.
   * @return {IEarlProperties} A data object.
   */
  public packageJsonToEarlProperties(packageJson: any): IEarlProperties {
    return {
      applicationBugsUrl: packageJson.bugs && packageJson.bugs.url ? packageJson.bugs.url : packageJson.bugs,
      applicationDescription: packageJson.description,
      applicationHomepageUrl: packageJson.homepage,
      applicationNameFull: packageJson.name,
      applicationNameNpm: packageJson.name,
      applicationUri: packageJson.name ? 'https://www.npmjs.com/package/' + packageJson.name + '/' : null,
      authors: [
        {
          homepage: null,
          name: packageJson.author,
          uri: null,
        },
      ],
      licenseUri: packageJson.license ? Util.licenseToUri(packageJson.license) : null,
      reportUri: null,
      specificationUris: [],
    };
  }
}

export interface IEarlProperties {
  reportUri: string;
  authors: IAuthor[];
  licenseUri: string;
  applicationUri: string;
  applicationHomepageUrl: string;
  applicationBugsUrl?: string;
  applicationBlogUrl?: string;
  applicationNameFull: string;
  applicationNameNpm: string;
  applicationDescription: string;
  specificationUris: string[];
}

export interface IAuthor {
  uri: string;
  name: string;
  homepage: string;
  primaryTopic?: string;
}

export interface ITestResult {
  test: ITestCase<any>;
  ok: boolean;
  error?: Error;
}
