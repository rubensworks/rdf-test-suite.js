import { Transform } from 'node:stream';
import { Parser } from 'n3';

// Temporarily enable N3 mode to allow blank node predicates (needed by JSON-LD tests)
const readPredicateOld = (<any> Parser.prototype)._readPredicate;
(<any> Parser.prototype)._readPredicate = function(token: any) {
  if (!this.allowBlankNodePredicates || this._n3Mode) {
    return readPredicateOld.call(this, token);
  }

  const quantified = this._quantified;
  this._n3Mode = true;
  this._quantified = {};
  try {
    return readPredicateOld.call(this, token);
  } finally {
    this._n3Mode = false;
    this._quantified = quantified;
  }
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
            case 'data':
              onData = callback;
              break;
            case 'end':
              onEnd = callback;
              break;
          }
        },
      },
      // Handle quads by pushing them down the pipeline
      (error: any, quad: any) => (error && this.emit('error', error)) || (quad && this.push(quad)),
      // Emit prefixes through the `prefix` event
      (prefix: any, uri: any) => {
        this.emit('prefix', prefix, uri);
      },
    );

    // Implement Transform methods through parser callbacks
    this._transform = (chunk, encoding, done) => {
      onData(chunk);
      done();
    };
    this._flush = (done) => {
      onEnd();
      done();
    };
  }
}
