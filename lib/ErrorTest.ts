/**
 * Error to indicate that this is a test failure.
 */
export class ErrorTest extends Error {
  public readonly test: boolean;

  public constructor(message?: string) {
  }
}
