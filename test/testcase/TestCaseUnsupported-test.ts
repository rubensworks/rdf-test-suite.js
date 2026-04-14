import { TestCaseUnsupported, TestCaseUnsupportedHandler } from '../../lib/testcase/TestCaseUnsupported';

describe('TestCaseUnsupportedHandler', () => {
  const handler = new TestCaseUnsupportedHandler('someHandler');

  describe('#resourceToTestCase', () => {
    it('should produce TestCaseUnsupported', async() => {
      const testCase = await handler.resourceToTestCase(null, <any> { a: 'b' });
      expect(testCase).toBeInstanceOf(TestCaseUnsupported);
      expect(testCase.type).toBe('unsupported');
      expect((<any> testCase).a).toBe('b');
      expect(testCase.testCaseName).toBe('someHandler');
    });

    it('should produce TestCaseUnsupported that reject on test', async() => {
      const testCase = await handler.resourceToTestCase(null, <any> { a: 'b' });
      expect(testCase.test(null)).rejects.toBeTruthy();
    });
  });
});
