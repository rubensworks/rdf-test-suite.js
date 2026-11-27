import { TestCaseLoadError } from '../../lib/testcase/TestCaseLoadError';

describe('TestCaseLoadError', () => {
  it('should hold the test case data and the error', () => {
    const error = new Error('Could not find http://example.org/result.srj');
    const testCase = new TestCaseLoadError(<any> { a: 'b' }, error);
    expect(testCase.type).toBe('loaderror');
    expect((<any> testCase).a).toBe('b');
    expect(testCase.error).toBe(error);
  });

  it('should reject on test with the error', async() => {
    const error = new Error('Could not find http://example.org/result.srj');
    const testCase = new TestCaseLoadError(<any> {}, error);
    await expect(testCase.test(null)).rejects.toBe(error);
  });
});
