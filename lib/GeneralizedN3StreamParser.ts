import {Parser} from "n3";
import {Transform} from "stream";

export class GeneralizedN3StreamParser extends Transform {

  constructor(options: any) {
    super({ decodeStrings: true });

    (<any> this)._readableState.objectMode = true;

    // Set up parser
    const parser: any = new Parser(options);

    // Set to format to text/n3 to allow blank node predicates (needed by JSON-LD tests)
    parser._n3Mode = true;

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
