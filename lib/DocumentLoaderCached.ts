import {IDocumentLoader, IJsonLdContextNormalized} from "jsonld-context-parser";
import {IFetchOptions, Util} from "./Util";

/**
 * A JSON-LD context document loader that is based on {@link Util#fetchCached}.
 */
export class DocumentLoaderCached implements IDocumentLoader {

  private readonly options: IFetchOptions;

  constructor(options: IFetchOptions) {
    this.options = options;
  }

  public async load(url: string): Promise<IJsonLdContextNormalized> {
    const { body } = await Util.fetchCached(url,
      this.options, { headers: { accept: 'application/ld+json' } });
    return JSON.parse(await require('stream-to-string')(body));
  }

}
