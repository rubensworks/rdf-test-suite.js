import {TestCaseUnsupported, TestCaseUnsupportedHandler} from "../../lib/testcase/TestCaseUnsupported";

describe('TestCaseUnsupportedHandler', () => {

  const handler = new TestCaseUnsupportedHandler('someHandler');

  describe('#resourceToTestCase', () => {
    it('should produce TestCaseUnsupported', async () => {
      const testCase = await handler.resourceToTestCase(null, <any> { a: 'b' });
      expect(testCase).toBeInstanceOf(TestCaseUnsupported);
      expect(testCase.type).toEqual('unsupported');
      expect((<any> testCase).a).toEqual('b');
      expect(testCase.testCaseName).toEqual('someHandler');
    });

    it('should produce TestCaseUnsupported that reject on test', async () => {
      const testCase = await handler.resourceToTestCase(null, <any> { a: 'b' });
      expect(testCase.test(null)).rejects.toBeTruthy();
    });
  });
});
