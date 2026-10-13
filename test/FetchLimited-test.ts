import { createLimitedFetch } from '../lib/FetchLimited';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

describe('createLimitedFetch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use the global fetch by default', async() => {
    const response = new Response('ABC');
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const fetchLimited = createLimitedFetch({});
    await expect(fetchLimited('http://example.org/', { method: 'HEAD' })).resolves.toBe(response);
    expect(spy).toHaveBeenCalledWith('http://example.org/', { method: 'HEAD' });
  });

  it('should pass through a successful response', async() => {
    const response = new Response('ABC');
    const fetchInner = jest.fn().mockResolvedValue(response);
    const fetchLimited = createLimitedFetch({ retries: 3, retryDelay: 0 }, fetchInner);
    await expect(fetchLimited('http://example.org/')).resolves.toBe(response);
    expect(fetchInner).toHaveBeenCalledTimes(1);
  });

  it('should not limit the number of concurrent requests by default', async() => {
    const pending = [ 1, 2, 3, 4, 5 ].map(() => deferred<Response>());
    let i = 0;
    const fetchInner = jest.fn(() => pending[i++].promise);
    const fetchLimited = createLimitedFetch({}, fetchInner);

    const responses = pending.map(() => fetchLimited('http://example.org/'));
    await flushPromises();
    expect(fetchInner).toHaveBeenCalledTimes(5);

    for (const { resolve } of pending) {
      resolve(new Response('ABC'));
    }
    await Promise.all(responses);
  });

  it('should limit the number of concurrent requests', async() => {
    const pending = [ 1, 2, 3, 4, 5 ].map(() => deferred<Response>());
    let i = 0;
    const fetchInner = jest.fn(() => pending[i++].promise);
    const fetchLimited = createLimitedFetch({ maxConcurrentRequests: 2 }, fetchInner);

    const responses = pending.map(() => fetchLimited('http://example.org/'));
    await flushPromises();
    expect(fetchInner).toHaveBeenCalledTimes(2);

    pending[0].resolve(new Response('ABC'));
    await flushPromises();
    expect(fetchInner).toHaveBeenCalledTimes(3);

    pending[1].resolve(new Response('ABC'));
    pending[2].resolve(new Response('ABC'));
    await flushPromises();
    expect(fetchInner).toHaveBeenCalledTimes(5);

    pending[3].resolve(new Response('ABC'));
    pending[4].resolve(new Response('ABC'));
    await Promise.all(responses);
  });

  it('should release a request slot when a request fails', async() => {
    const fetchInner = jest.fn()
      .mockRejectedValueOnce(new Error('Fetch error'))
      .mockResolvedValueOnce(new Response('ABC'));
    const fetchLimited = createLimitedFetch({ maxConcurrentRequests: 1 }, fetchInner);

    const response1 = fetchLimited('http://example.org/1');
    const response2 = fetchLimited('http://example.org/2');
    await expect(response1).rejects.toThrow('Fetch error');
    await expect(response2).resolves.toBeInstanceOf(Response);
  });

  it('should not retry by default', async() => {
    const fetchInner = jest.fn().mockResolvedValue(new Response(null, { status: 429 }));
    const fetchLimited = createLimitedFetch({}, fetchInner);
    await expect(fetchLimited('http://example.org/')).resolves.toMatchObject({ status: 429 });
    expect(fetchInner).toHaveBeenCalledTimes(1);
  });

  it('should retry on a retryable status code and discard the body', async() => {
    const response429 = new Response('Too many requests', { status: 429 });
    const cancelSpy = jest.spyOn(response429.body, 'cancel');
    const response200 = new Response('ABC');
    const fetchInner = jest.fn()
      .mockResolvedValueOnce(response429)
      .mockResolvedValueOnce(response200);
    const fetchLimited = createLimitedFetch({ retries: 3, retryDelay: 0 }, fetchInner);

    await expect(fetchLimited('http://example.org/')).resolves.toBe(response200);
    expect(fetchInner).toHaveBeenCalledTimes(2);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should return the last response once retries are exhausted', async() => {
    const response1 = new Response(null, { status: 503 });
    const response2 = new Response(null, { status: 503 });
    const response3 = new Response('Unavailable', { status: 503 });
    const cancelSpy = jest.spyOn(response3.body, 'cancel');
    const fetchInner = jest.fn()
      .mockResolvedValueOnce(response1)
      .mockResolvedValueOnce(response2)
      .mockResolvedValueOnce(response3);
    const fetchLimited = createLimitedFetch({ retries: 2, retryDelay: 0 }, fetchInner);

    await expect(fetchLimited('http://example.org/')).resolves.toBe(response3);
    expect(fetchInner).toHaveBeenCalledTimes(3);
    expect(cancelSpy).not.toHaveBeenCalled();
    await expect(response3.text()).resolves.toBe('Unavailable');
  });

  it('should not retry on a non-retryable status code', async() => {
    const response = new Response(null, { status: 404 });
    const fetchInner = jest.fn().mockResolvedValue(response);
    const fetchLimited = createLimitedFetch({ retries: 3, retryDelay: 0 }, fetchInner);
    await expect(fetchLimited('http://example.org/')).resolves.toBe(response);
    expect(fetchInner).toHaveBeenCalledTimes(1);
  });

  it('should retry on network errors', async() => {
    const response = new Response('ABC');
    const fetchInner = jest.fn()
      .mockRejectedValueOnce(new Error('Fetch error'))
      .mockResolvedValueOnce(response);
    const fetchLimited = createLimitedFetch({ retries: 3, retryDelay: 0 }, fetchInner);
    await expect(fetchLimited('http://example.org/')).resolves.toBe(response);
    expect(fetchInner).toHaveBeenCalledTimes(2);
  });

  it('should reject once retries are exhausted on network errors', async() => {
    const fetchInner = jest.fn().mockRejectedValue(new Error('Fetch error'));
    const fetchLimited = createLimitedFetch({ retries: 2, retryDelay: 0 }, fetchInner);
    await expect(fetchLimited('http://example.org/')).rejects.toThrow('Fetch error');
    expect(fetchInner).toHaveBeenCalledTimes(3);
  });

  it('should exponentially increase the delay between retries', async() => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const fetchInner = jest.fn().mockRejectedValue(new Error('Fetch error'));
    const fetchLimited = createLimitedFetch({ retries: 3, retryDelay: 5 }, fetchInner);

    await expect(fetchLimited('http://example.org/')).rejects.toThrow('Fetch error');
    expect(fetchInner).toHaveBeenCalledTimes(4);
    expect(timeoutSpy.mock.calls.map(call => call[1])).toEqual([ 5, 10, 20 ]);
  });

  it('should default to a retry delay of 1 second', async() => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout').mockImplementation((callback: () => void) => {
      callback();
      return <any> undefined;
    });
    const fetchInner = jest.fn().mockRejectedValue(new Error('Fetch error'));
    const fetchLimited = createLimitedFetch({ retries: 2 }, fetchInner);

    await expect(fetchLimited('http://example.org/')).rejects.toThrow('Fetch error');
    expect(timeoutSpy.mock.calls.map(call => call[1])).toEqual([ 1_000, 2_000 ]);
  });
});
