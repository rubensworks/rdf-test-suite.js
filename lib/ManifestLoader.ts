import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { termToString } from 'rdf-string';
import type { IManifest } from './IManifest';
import { manifestFromResource } from './IManifest';
import type { ITestCase } from './testcase/ITestCase';
import type { ITestCaseHandler } from './testcase/ITestCaseHandler';
import type { IFetchOptions } from './Util';
import { Util } from './Util';

/**
 * A ManifestLoader loads test suites from URLs.
 */
export class ManifestLoader {
  // eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
  public static readonly defaultTestCaseHandlers: Record<string, ITestCaseHandler<ITestCase<any>>> =
    require('./testcase/TestCaseHandlers') as Record<string, ITestCaseHandler<ITestCase<any>>>;

  // eslint-disable-next-line ts/no-require-imports, ts/no-var-requires
  public static readonly loaderContext: Record<string, unknown> =
    require('./context-manifest.json') as Record<string, unknown>;

  private readonly testCaseHandlers: Record<string, ITestCaseHandler<ITestCase<any>>>;

  public constructor(args?: IManifestLoaderArgs) {
    if (!args) {
      args = {};
    }
    this.testCaseHandlers = args.testCaseHandlers || ManifestLoader.defaultTestCaseHandlers;
  }

  /**
   * Load the manifest from the given URL.
   * @param {string} url The URL of a manifest.
   * @param {IFetchOptions} options The fetch options.
   * @return {Promise<IManifest>} A promise that resolves to a manifest object.
   */
  public async from(url: string, options?: IFetchOptions): Promise<IManifest> {
    const objectLoader = new RdfObjectLoader({ context: ManifestLoader.loaderContext });
    const manifest: Resource = await this.import(objectLoader, url, options);
    return manifestFromResource(this.testCaseHandlers, options, manifest, objectLoader);
  }

  protected async import(objectLoader: RdfObjectLoader, urlInitial: string, options?: IFetchOptions): Promise<Resource> {
    const [ url, parsed ] = await Util.fetchRdf(urlInitial, options);
    // Dereference the URL and load it
    await objectLoader.import(parsed);

    // Import all sub-manifests
    let manifest: Resource =
      // First try the same URL as the document URL
      objectLoader.resources[url] ??
      // Also try extension-less manifest URL (needed for RDFa test suite)
      objectLoader.resources[url.slice(0, url.lastIndexOf('.'))] ??
      // Also try extension-less and with the last '/' replaced with a '#' (needed for RDFstar test suite)
      // @see https://github.com/w3c/rdf-star/issues/269
      objectLoader.resources[url.slice(0, url.lastIndexOf('.')).replace(/\/manifest$/u, '#manifest')];

    if (!manifest) {
      throw new Error(`Could not find a resource ${url} in the document at ${url}`);
    }
    const includeJobs: Promise<any>[] = [];
      for (const include of includeList.list) {
        if (include.term.termType !== 'NamedNode') {
          throw new Error(`Found invalid manifest term ${termToString(include.term)} when parsing ${url}`);
        }
        includeJobs.push(this.import(objectLoader, include.value, options));
      }
    }

    await Promise.all(includeJobs);

    manifest =
      // First try the same URL as the document URL
      objectLoader.resources[url] ??
      // Also try extension-less manifest URL (needed for RDFa test suite)
      objectLoader.resources[url.slice(0, url.lastIndexOf('.'))] ??
      // Also try extension-less and with the last '/' replaced with a '#' (needed for RDFstar test suite)
      // @see https://github.com/w3c/rdf-star/issues/269
      objectLoader.resources[url.slice(0, url.lastIndexOf('.')).replace(/\/manifest$/u, '#manifest')];

    return manifest;
  }
}

export interface IManifestLoaderArgs {
  testCaseHandlers?: Record<string, ITestCaseHandler<ITestCase<any>>>;
}
