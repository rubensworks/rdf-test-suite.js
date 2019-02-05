import {ErrorSkipped} from "../lib/ErrorSkipped";

describe('ErrorSkipped', () => {

  it('should be constructable with arg', () => {
    return expect(new ErrorSkipped('abc')).toBeInstanceOf(Error);
  });

  it('should be constructable without arg', () => {
    return expect(new ErrorSkipped()).toBeInstanceOf(Error);
  });

  it('should be constructable without new', () => {
    return expect((<any> ErrorSkipped)()).toBeInstanceOf(Error);
  });

  it('should expose the skipped field', () => {
    return expect(new ErrorSkipped().skipped).toBe(true);
  });

});
