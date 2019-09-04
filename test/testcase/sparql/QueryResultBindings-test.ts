import {literal, namedNode} from "@rdfjs/data-model";
import {QueryResultBindings} from "../../../lib/testcase/sparql/QueryResultBindings";

describe('QueryResultBindings', () => {

  let bindingsAB1;
  let bindingsAB1Duplicates;
  let bindingsAB1Reduced;
  let bindingsAB1oo;
  let bindingsAB1Empty;
  let bindingsBA1;
  let bindingsBA1Empty;
  let bindingsCD1;
  let bindingsCD1Empty;
  let bindingDecimalShort;
  let bindingDecimalLong;

  let bindingsAB1Order;
  let bindingsAB1ooOrder;
  let bindingsAB1EmptyOrder;
  let bindingsBA1Order;
  let bindingsBA1EmptyOrder;
  let bindingsCD1Order;
  let bindingsCD1EmptyOrder;
  let bindingDecimalShortOrder;
  let bindingDecimalLongOrder;

  beforeEach(() => {
    bindingsAB1 = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], false);
    bindingsAB1Duplicates = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], false);
    bindingsAB1Reduced = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], false);
    bindingsAB1oo = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
    ], false);
    bindingsAB1Empty = new QueryResultBindings([ '?a', '?b' ], [], false);
    bindingsBA1 = new QueryResultBindings([ '?b', '?a' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], false);
    bindingsBA1Empty = new QueryResultBindings([ '?b', '?a' ], [], false);
    bindingsCD1 = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': namedNode('c1'),
        '?d': namedNode('d1'),
      },
      {
        '?c': namedNode('c2'),
        '?d': namedNode('d2'),
      },
    ], false);
    bindingsCD1Empty = new QueryResultBindings([ '?c', '?d' ], [], false);
    bindingDecimalShort = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': literal('2', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('3', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': literal('4.4', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('5.5', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], false);
    bindingDecimalLong = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': literal('2.000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('3.00', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': literal('4.40000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('5.50000000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], false);

    bindingsAB1Order = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], true);
    bindingsAB1ooOrder = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
    ], true);
    bindingsAB1EmptyOrder = new QueryResultBindings([ '?a', '?b' ], [], true);
    bindingsBA1Order = new QueryResultBindings([ '?b', '?a' ], [
      {
        '?a': namedNode('a1'),
        '?b': namedNode('b1'),
      },
      {
        '?a': namedNode('a2'),
        '?b': namedNode('b2'),
      },
    ], true);
    bindingsBA1EmptyOrder = new QueryResultBindings([ '?b', '?a' ], [], true);
    bindingsCD1Order = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': namedNode('c1'),
        '?d': namedNode('d1'),
      },
      {
        '?c': namedNode('c2'),
        '?d': namedNode('d2'),
      },
    ], true);
    bindingsCD1EmptyOrder = new QueryResultBindings([ '?c', '?d' ], [], true);
    bindingDecimalShortOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': literal('2', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('3', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': literal('4.4', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('5.5', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], true);
    bindingDecimalLongOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': literal('2.000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('3.00', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': literal('4.40000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': literal('5.50000000', namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], true);
  });

  describe('when instantiated', () => {
    it('should be instance of QueryResultBindings', () => {
      return expect(bindingsAB1).toBeInstanceOf(QueryResultBindings);
    });

    it('should be of type bindings', () => {
      return expect(bindingsAB1.type).toEqual('bindings');
    });

    it('should have the correct variables', () => {
      return expect(bindingsAB1.variables).toEqual([ '?a', '?b' ]);
    });

    it('should have the correct value', () => {
      return expect(bindingsAB1.value).toEqual([
        {
          '?a': namedNode('a1'),
          '?b': namedNode('b1'),
        },
        {
          '?a': namedNode('a2'),
          '?b': namedNode('b2'),
        },
      ]);
    });

    it('should have the correct checkOrder flag', () => {
      return expect(bindingsAB1.checkOrder).toEqual(false);
    });
  });

  describe('#equals', () => {
    describe('with strict cardinality', () => {
      describe('with strict order', () => {
        it('should be false for a non query result', () => {
          return expect(bindingsAB1EmptyOrder.equals(<any> {})).toBeFalsy();
        });

        it('should be false for different variables', () => {
          return expect(bindingsAB1EmptyOrder.equals(bindingsCD1EmptyOrder)).toBeFalsy();
        });

        it('should be true for equal variables', () => {
          return expect(bindingsAB1EmptyOrder.equals(bindingsAB1EmptyOrder)).toBeTruthy();
        });

        it('should be true for equal out-of-order variables', () => {
          return expect(bindingsAB1EmptyOrder.equals(bindingsBA1EmptyOrder)).toBeTruthy();
        });

        it('should be true for equal results', () => {
          return expect(bindingsAB1Order.equals(bindingsAB1Order)).toBeTruthy();
        });

        it('should be false for for non-equal results', () => {
          return expect(bindingsAB1Order.equals(bindingsCD1Order)).toBeFalsy();
        });

        it('should be false for for out-of-order results', () => {
          return expect(bindingsAB1Order.equals(bindingsAB1ooOrder)).toBeFalsy();
        });

        it('should be true for literals with different lexical forms', () => {
          return expect(bindingDecimalShortOrder.equals(bindingDecimalLongOrder)).toBeTruthy();
        });
      });

      describe('with non-strict order', () => {
        it('should be false for a non query result', () => {
          return expect(bindingsAB1Empty.equals(<any> {})).toBeFalsy();
        });

        it('should be false for different variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsCD1Empty)).toBeFalsy();
        });

        it('should be true for equal variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsAB1Empty)).toBeTruthy();
        });

        it('should be true for equal out-of-order variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsBA1Empty)).toBeTruthy();
        });

        it('should be true for equal results', () => {
          return expect(bindingsAB1.equals(bindingsAB1)).toBeTruthy();
        });

        it('should be false for for non-equal results', () => {
          return expect(bindingsAB1.equals(bindingsCD1)).toBeFalsy();
        });

        it('should be true for for out-of-order results', () => {
          return expect(bindingsAB1.equals(bindingsAB1oo)).toBeTruthy();
        });

        it('should be true for literals with different lexical forms', () => {
          return expect(bindingDecimalShort.equals(bindingDecimalLong)).toBeTruthy();
        });
      });
    });

    describe('with lax cardinality', () => {
      describe('with non-strict order', () => {
        it('should be false for a non query result', () => {
          return expect(bindingsAB1Empty.equals(<any> {}, true)).toBeFalsy();
        });

        it('should be false for different variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsCD1Empty, true)).toBeFalsy();
        });

        it('should be true for equal variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsAB1Empty, true)).toBeTruthy();
        });

        it('should be true for equal out-of-order variables', () => {
          return expect(bindingsAB1Empty.equals(bindingsBA1Empty, true)).toBeTruthy();
        });

        it('should be true for equal results', () => {
          return expect(bindingsAB1.equals(bindingsAB1, true)).toBeTruthy();
        });

        it('should be false for for non-equal results', () => {
          return expect(bindingsAB1.equals(bindingsCD1, true)).toBeFalsy();
        });

        it('should be true for for out-of-order results', () => {
          return expect(bindingsAB1.equals(bindingsAB1oo, true)).toBeTruthy();
        });

        it('should be false for no results', () => {
          return expect(bindingsAB1Duplicates.equals(bindingsAB1Empty, true)).toBeFalsy();
        });

        it('should be true for true distinct results', () => {
          return expect(bindingsAB1Duplicates.equals(bindingsAB1, true)).toBeTruthy();
        });

        it('should be true for for partially reduced results', () => {
          return expect(bindingsAB1Duplicates.equals(bindingsAB1Reduced, true)).toBeTruthy();
        });

        it('should be false for more results', () => {
          return expect(bindingsAB1Reduced.equals(bindingsAB1Duplicates, true)).toBeFalsy();
        });

        it('should be true for literals with different lexical forms', () => {
          return expect(bindingDecimalShort.equals(bindingDecimalLong, true)).toBeTruthy();
        });
      });
    });
  });

  describe('#toString', () => {
    it('should stringify the bindings', () => {
      return expect(bindingsAB1.toString()).toEqual(`[QueryResultBindings:
    Variables: [
  "?a",
  "?b"
]
    Bindings:  [
  {
    "?a": {
      "value": "a1"
    },
    "?b": {
      "value": "b1"
    }
  },
  {
    "?a": {
      "value": "a2"
    },
    "?b": {
      "value": "b2"
    }
  }
]
]`);
    });
  });

});
