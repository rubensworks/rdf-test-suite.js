import { Sema } from 'async-sema';
import { backOff } from 'exponential-backoff';

/**
 * HTTP status codes that indicate a temporary failure, after which a request may be retried.
 */
export const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([ 408, 425, 429, 500, 502, 503, 504 ]);

export interface IFetchLimitOptions {
  /**
   * The maximum number of HTTP requests that may be in flight at the same time.
   * If falsy, the number of concurrent requests is unlimited.
   */
  maxConcurrentRequests?: number;
  /**
   * The number of times a request is retried after a network error or a retryable status code (such as 429).
   * Defaults to 0.
   */
  retries?: number;
  /**
   * The delay in milliseconds before the first retry, which is doubled after every retry.
   * A random jitter is applied to this delay.
   * Defaults to 1000.
   */
  retryDelay?: number;
}

/**
 * Error that wraps a response with a retryable status code.
 */
class ErrorRetryableResponse extends Error {
  public readonly response: Response;

  public constructor(response: Response) {
    super(`Received status code ${response.status} from ${response.url}`);
    this.response = response;
  }
}

/**
 * Create a fetch function that limits the number of concurrent requests,
 * and retries failed requests with exponential backoff.
 * @param {IFetchLimitOptions} options Options for limiting and retrying requests.
 * @param fetchInner The fetch function to wrap, defaults to the global fetch.
 * @return The wrapped fetch function.
 */
export function createLimitedFetch(
  options: IFetchLimitOptions,
  fetchInner: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  const semaphore = options.maxConcurrentRequests ? new Sema(options.maxConcurrentRequests) : undefined;
  const numOfAttempts = (options.retries ?? 0) + 1;
  const startingDelay = options.retryDelay ?? 1_000;

  async function fetchAttempt(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    await semaphore?.acquire();
    try {
      const response = await fetchInner(input, init);
      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new ErrorRetryableResponse(response);
      }
      return response;
    } finally {
      semaphore?.release();
    }
  }

  return async(input, init) => {
    try {
      return await backOff(() => fetchAttempt(input, init), {
        numOfAttempts,
        startingDelay,
        timeMultiple: 2,
        jitter: 'full',
        async retry(error: unknown, attemptNumber: number) {
          // Discard the body of responses that will be retried, so that the connection can be reused
          if (error instanceof ErrorRetryableResponse && attemptNumber < numOfAttempts) {
            await error.response.body?.cancel().catch(/* istanbul ignore next */ (): undefined => undefined);
          }
          return true;
        },
      });
    } catch (error: unknown) {
      // Once all retries are exhausted, pass the last response to the caller, like a regular fetch
      if (error instanceof ErrorRetryableResponse) {
        return error.response;
      }
      throw error;
    }
  };
}
