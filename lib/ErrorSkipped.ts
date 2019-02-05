/**
 * An error to indicate if a test should be skipped.
 */
export class ErrorSkipped extends Error {

  public readonly skipped: boolean;

  constructor(message?: string) {
    super(message);
    this.skipped = true;
  }

}
