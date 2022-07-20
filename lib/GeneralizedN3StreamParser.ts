import {Parser} from "n3";
import {Transform} from "stream";

// Temporarily set format to text/n3 to allow blank node predicates (needed by JSON-LD tests)
const readPredicateOld = (<any> Parser.prototype)._readPredicate;
// tslint:disable-next-line:only-arrow-functions
(<any> Parser.prototype)._readPredicate = function(token: any) {
  if (this.allowBlankNodePredicates) {
    this._n3Mode = true;
    this._quantified = {};
  }
  const ret = readPredicateOld.call(this, token);
  if (this.allowBlankNodePredicates) {
    this._n3Mode = false;
    delete this._quantified;
  }
  return ret;
};

export class GeneralizedN3StreamParser extends Transform {

  constructor(options: any) {
    super({ decodeStrings: true });

    (<any> this)._readableState.objectMode = true;

    // Set up parser
    const parser: any = new Parser(options);
    parser.allowBlankNodePredicates = true;
    // This is a workaround to resolve the RDF* syntax issue seen in
    // https://github.com/rubensworks/rdf-test-suite.js/pull/78#issue-1307275029
    parser._supportsRDFStar = true;

    let onData: any;
    let onEnd: any;
    // Pass dummy stream to obtain `data` and `end` callbacks
    parser.parse(
      {
        on: (event: any, callback: any) => {
          switch (event) {
          case 'data': onData = callback; break;
          case 'end':   onEnd = callback; break;
          }
        },
      },
      // Handle quads by pushing them down the pipeline
      (error: any, quad: any) => error && this.emit('error', error) || quad && this.push(quad),
      // Emit prefixes through the `prefix` event
      (prefix: any, uri: any) => { this.emit('prefix', prefix, uri); });

    // Implement Transform methods through parser callbacks
    this._transform = (chunk, encoding, done) => { onData(chunk); done(); };
    this._flush = (done) => { onEnd(); done(); };
  }

}
