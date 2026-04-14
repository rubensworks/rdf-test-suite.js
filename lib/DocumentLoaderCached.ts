import type { IDocumentLoader, IJsonLdContext } from 'jsonld-context-parser';
import type { IFetchOptions } from './Util';
import { Util } from './Util';

/**
 * A JSON-LD context document loader that is based on {@link Util#fetchCached}.
 */
export class DocumentLoaderCached implements IDocumentLoader {
  private readonly options: IFetchOptions;

  public constructor(options: IFetchOptions) {
    this.options = options;
  }

  public async load(url: string): Promise<IJsonLdContext> {
    const { body } = await Util.fetchCached(url, this.options, { headers: { accept: 'application/ld+json' }});
    // eslint-disable-next-line ts/no-require-imports, ts/no-var-requires, ts/no-unsafe-call
    return JSON.parse(await (require('stream-to-string') as (s: NodeJS.ReadableStream) => Promise<string>)(body)) as IJsonLdContext;
  }
}
