import {DataFactory} from "rdf-data-factory";
import {QueryResultBindings} from "../../../lib/testcase/sparql/QueryResultBindings";

const DF = new DataFactory();

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
  let bindingBlankNode1Lower;
  let bindingBlankNode1Upper;
  let bindingBlankNode2;

  let bindingsAB1Order;
  let bindingsAB1ooOrder;
  let bindingsAB1EmptyOrder;
  let bindingsBA1Order;
  let bindingsBA1EmptyOrder;
  let bindingsCD1Order;
  let bindingsCD1EmptyOrder;
  let bindingDecimalShortOrder;
  let bindingDecimalLongOrder;
  let bindingBlankNode1LowerOrder;
  let bindingBlankNode1UpperOrder;
  let bindingBlankNode2Order;

  beforeEach(() => {
    bindingsAB1 = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], false);
    bindingsAB1Duplicates = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], false);
    bindingsAB1Reduced = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], false);
    bindingsAB1oo = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
    ], false);
    bindingsAB1Empty = new QueryResultBindings([ '?a', '?b' ], [], false);
    bindingsBA1 = new QueryResultBindings([ '?b', '?a' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], false);
    bindingsBA1Empty = new QueryResultBindings([ '?b', '?a' ], [], false);
    bindingsCD1 = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.namedNode('c1'),
        '?d': DF.namedNode('d1'),
      },
      {
        '?c': DF.namedNode('c2'),
        '?d': DF.namedNode('d2'),
      },
    ], false);
    bindingsCD1Empty = new QueryResultBindings([ '?c', '?d' ], [], false);
    bindingDecimalShort = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('3', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': DF.literal('4.4', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('5.5', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], false);
    bindingDecimalLong = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.literal('2.000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('3.00', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': DF.literal('4.40000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('5.50000000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], false);
    bindingBlankNode1Lower = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('a'),
        '?d': DF.blankNode('b'),
      },
      {
        '?c': DF.blankNode('c'),
        '?d': DF.blankNode('d'),
      },
    ], false);
    bindingBlankNode1Upper = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('A'),
        '?d': DF.blankNode('B'),
      },
      {
        '?c': DF.blankNode('C'),
        '?d': DF.blankNode('D'),
      },
    ], false);
    bindingBlankNode2 = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('a'),
        '?d': DF.blankNode('a'),
      },
      {
        '?c': DF.blankNode('c'),
        '?d': DF.blankNode('d'),
      },
    ], false);

    bindingsAB1Order = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], true);
    bindingsAB1ooOrder = new QueryResultBindings([ '?a', '?b' ], [
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
    ], true);
    bindingsAB1EmptyOrder = new QueryResultBindings([ '?a', '?b' ], [], true);
    bindingsBA1Order = new QueryResultBindings([ '?b', '?a' ], [
      {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      },
      {
        '?a': DF.namedNode('a2'),
        '?b': DF.namedNode('b2'),
      },
    ], true);
    bindingsBA1EmptyOrder = new QueryResultBindings([ '?b', '?a' ], [], true);
    bindingsCD1Order = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.namedNode('c1'),
        '?d': DF.namedNode('d1'),
      },
      {
        '?c': DF.namedNode('c2'),
        '?d': DF.namedNode('d2'),
      },
    ], true);
    bindingsCD1EmptyOrder = new QueryResultBindings([ '?c', '?d' ], [], true);
    bindingDecimalShortOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('3', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': DF.literal('4.4', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('5.5', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], true);
    bindingDecimalLongOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.literal('2.000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('3.00', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
      {
        '?c': DF.literal('4.40000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
        '?d': DF.literal('5.50000000', DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal')),
      },
    ], true);
    bindingBlankNode1LowerOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('a'),
        '?d': DF.blankNode('b'),
      },
      {
        '?c': DF.blankNode('c'),
        '?d': DF.blankNode('d'),
      },
    ], true);
    bindingBlankNode1UpperOrder = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('A'),
        '?d': DF.blankNode('B'),
      },
      {
        '?c': DF.blankNode('C'),
        '?d': DF.blankNode('D'),
      },
    ], true);
    bindingBlankNode2Order = new QueryResultBindings([ '?c', '?d' ], [
      {
        '?c': DF.blankNode('a'),
        '?d': DF.blankNode('a'),
      },
      {
        '?c': DF.blankNode('c'),
        '?d': DF.blankNode('d'),
      },
    ], true);
  });

  describe('#hashBinding', () => {
    it('should a binding with named nodes', () => {
      const binding = {
        '?a': DF.namedNode('a1'),
        '?b': DF.namedNode('b1'),
      };
      return expect(QueryResultBindings.hashBinding(binding, {}))
        .toEqual('{\"?a\":\"a1\",\"?b\":\"b1\"}');
    });

    it('should a binding with named nodes populated in a different order', () => {
      const binding = {
        '?b': DF.namedNode('b1'),
      };
      binding['?a'] = DF.namedNode('a1');
      return expect(QueryResultBindings.hashBinding(binding, {}))
        .toEqual('{\"?a\":\"a1\",\"?b\":\"b1\"}');
    });
  });

  describe('#hashBindings', () => {
    describe('ignoring order', () => {
      it('should hash bindings with named nodes', () => {
        return expect(QueryResultBindings.hashBindings(bindingsAB1.value, {}, false))
          .toEqual('{\"?a\":\"a1\",\"?b\":\"b1\"}{\"?a\":\"a2\",\"?b\":\"b2\"}');
      });

      it('should unordered hash bindings with named nodes', () => {
        return expect(QueryResultBindings.hashBindings([
          {
            '?a': DF.namedNode('a2'),
            '?b': DF.namedNode('b2'),
          },
          {
            '?a': DF.namedNode('a1'),
            '?b': DF.namedNode('b1'),
          },
        ], {}, false))
          .toEqual('{\"?a\":\"a1\",\"?b\":\"b1\"}{\"?a\":\"a2\",\"?b\":\"b2\"}');
      });

      it('should hash bindings with blank nodes', () => {
        return expect(QueryResultBindings.hashBindings(bindingBlankNode1Lower.value, {}, false))
          .toEqual('{\"?c\":\"_:0\",\"?d\":\"_:1\"}{\"?c\":\"_:2\",\"?d\":\"_:3\"}');
      });
    });

    describe('checking order', () => {
      it('should hash bindings with named nodes', () => {
        return expect(QueryResultBindings.hashBindings(bindingsAB1.value, {}, true))
          .toEqual('{\"?a\":\"a1\",\"?b\":\"b1\"}{\"?a\":\"a2\",\"?b\":\"b2\"}');
      });

      it('should unordered hash bindings with named nodes', () => {
        return expect(QueryResultBindings.hashBindings([
          {
            '?a': DF.namedNode('a2'),
            '?b': DF.namedNode('b2'),
          },
          {
            '?a': DF.namedNode('a1'),
            '?b': DF.namedNode('b1'),
          },
        ], {}, true))
          .toEqual('{\"?a\":\"a2\",\"?b\":\"b2\"}{\"?a\":\"a1\",\"?b\":\"b1\"}');
      });

      it('should hash bindings with blank nodes', () => {
        return expect(QueryResultBindings.hashBindings(bindingBlankNode1Lower.value, {}, true))
          .toEqual('{\"?c\":\"_:0\",\"?d\":\"_:1\"}{\"?c\":\"_:2\",\"?d\":\"_:3\"}');
      });
    });
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
          '?a': DF.namedNode('a1'),
          '?b': DF.namedNode('b1'),
        },
        {
          '?a': DF.namedNode('a2'),
          '?b': DF.namedNode('b2'),
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

        it('should be true for bindings with isomorphic blank node structures', () => {
          return expect(bindingBlankNode1LowerOrder.equals(bindingBlankNode1UpperOrder)).toBeTruthy();
        });

        it('should be false for bindings with non-isomorphic blank node structures', () => {
          return expect(bindingBlankNode1LowerOrder.equals(bindingBlankNode2Order)).toBeFalsy();
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

        it('should be true for bindings with isomorphic blank node structures', () => {
          return expect(bindingBlankNode1Lower.equals(bindingBlankNode1Upper)).toBeTruthy();
        });

        it('should be false for bindings with non-isomorphic blank node structures', () => {
          return expect(bindingBlankNode1Lower.equals(bindingBlankNode2)).toBeFalsy();
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

        it('should be true for bindings with isomorphic blank node structures', () => {
          return expect(bindingBlankNode1Lower.equals(bindingBlankNode1Upper, true)).toBeTruthy();
        });

        it('should be false for bindings with non-isomorphic blank node structures', () => {
          return expect(bindingBlankNode1Lower.equals(bindingBlankNode2, true)).toBeFalsy();
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
      "termType": "NamedNode",
      "value": "a1"
    },
    "?b": {
      "termType": "NamedNode",
      "value": "b1"
    }
  },
  {
    "?a": {
      "termType": "NamedNode",
      "value": "a2"
    },
    "?b": {
      "termType": "NamedNode",
      "value": "b2"
    }
  }
]
]`);
    });
  });

});
