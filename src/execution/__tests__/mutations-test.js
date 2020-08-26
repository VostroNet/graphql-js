// @flow strict

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { parse } from '../../language/parser';

import { GraphQLInt } from '../../type/scalars';
import { GraphQLSchema } from '../../type/schema';
import { GraphQLObjectType } from '../../type/definition';

import { execute, executeSync } from '../execute';

class NumberHolder {
  theNumber: number;

  constructor(originalNumber: number) {
    this.theNumber = originalNumber;
  }
}

class Root {
  numberHolder: NumberHolder;

  constructor(originalNumber: number) {
    this.numberHolder = new NumberHolder(originalNumber);
  }

  immediatelyChangeTheNumber(newNumber: number): NumberHolder {
    this.numberHolder.theNumber = newNumber;
    return this.numberHolder;
  }

  promiseToChangeTheNumber(newNumber: number): Promise<NumberHolder> {
    return new Promise((resolve) => {
      process.nextTick(() => {
        resolve(this.immediatelyChangeTheNumber(newNumber));
      });
    });
  }

  failToChangeTheNumber(): NumberHolder {
    throw new Error('Cannot change the number');
  }

  promiseAndFailToChangeTheNumber(): Promise<NumberHolder> {
    return new Promise((_resolve, reject) => {
      process.nextTick(() => {
        reject(new Error('Cannot change the number'));
      });
    });
  }
}

const numberHolderType = new GraphQLObjectType({
  fields: {
    theNumber: { type: GraphQLInt },
  },
  name: 'NumberHolder',
});
const subFieldType = new GraphQLObjectType({
  name: 'subFieldMutation',
  fields: {
    immediatelyChangeTheNumber: {
      type: numberHolderType,
      args: { newNumber: { type: GraphQLInt } },
      resolve(obj, { newNumber }) {
        return obj.immediatelyChangeTheNumber(newNumber);
      },
    },
    promiseToChangeTheNumber: {
      type: numberHolderType,
      args: { newNumber: { type: GraphQLInt } },
      resolve(obj, { newNumber }) {
        return obj.promiseToChangeTheNumber(newNumber);
      },
    },
    failToChangeTheNumber: {
      type: numberHolderType,
      args: { newNumber: { type: GraphQLInt } },
      resolve(obj, { newNumber }) {
        return obj.failToChangeTheNumber(newNumber);
      },
    },
    promiseAndFailToChangeTheNumber: {
      type: numberHolderType,
      args: { newNumber: { type: GraphQLInt } },
      resolve(obj, { newNumber }) {
        return obj.promiseAndFailToChangeTheNumber(newNumber);
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    fields: {
      numberHolder: { type: numberHolderType },
    },
    name: 'Query',
  }),
  mutation: new GraphQLObjectType({
    fields: {
      subField: {
        type: subFieldType,
        resolve(obj) {
          return obj;
        },
      },
      immediatelyChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.immediatelyChangeTheNumber(newNumber);
        },
      },
      promiseToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.promiseToChangeTheNumber(newNumber);
        },
      },
      failToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.failToChangeTheNumber(newNumber);
        },
      },
      promiseAndFailToChangeTheNumber: {
        type: numberHolderType,
        args: { newNumber: { type: GraphQLInt } },
        resolve(obj, { newNumber }) {
          return obj.promiseAndFailToChangeTheNumber(newNumber);
        },
      },
    },
    name: 'Mutation',
  }),
});

describe('Execute: Handles mutation execution ordering', () => {
  it('evaluates mutations serially', async () => {
    const document = parse(`
      mutation M {
        first: immediatelyChangeTheNumber(newNumber: 1) {
          theNumber
        },
        second: promiseToChangeTheNumber(newNumber: 2) {
          theNumber
        },
        third: immediatelyChangeTheNumber(newNumber: 3) {
          theNumber
        }
        fourth: promiseToChangeTheNumber(newNumber: 4) {
          theNumber
        },
        fifth: immediatelyChangeTheNumber(newNumber: 5) {
          theNumber
        }
        subField {
          first: immediatelyChangeTheNumber(newNumber: 6) {
            theNumber
          },
          second: promiseToChangeTheNumber(newNumber: 7) {
            theNumber
          },
          third: immediatelyChangeTheNumber(newNumber: 8) {
            theNumber
          }
          fourth: promiseToChangeTheNumber(newNumber: 9) {
            theNumber
          },
          fifth: immediatelyChangeTheNumber(newNumber: 10) {
            theNumber
          }
        }
      }
    `);

    const rootValue = new Root(6);
    const mutationResult = await execute({ schema, document, rootValue });

    expect(mutationResult).to.deep.equal({
      data: {
        first: { theNumber: 1 },
        second: { theNumber: 2 },
        third: { theNumber: 3 },
        fourth: { theNumber: 4 },
        fifth: { theNumber: 5 },
        subField: {
          first: { theNumber: 6 },
          second: { theNumber: 7 },
          third: { theNumber: 8 },
          fourth: { theNumber: 9 },
          fifth: { theNumber: 10 },
        },
      },
    });
  });

  it('does not include illegal mutation fields in output', () => {
    const document = parse('mutation { thisIsIllegalDoNotIncludeMe }');

    const result = executeSync({ schema, document });
    expect(result).to.deep.equal({
      data: {},
    });
  });

  it('evaluates mutations correctly in the presence of a failed mutation', async () => {
    const document = parse(`
      mutation M {
        first: immediatelyChangeTheNumber(newNumber: 1) {
          theNumber
        },
        second: promiseToChangeTheNumber(newNumber: 2) {
          theNumber
        },
        third: failToChangeTheNumber(newNumber: 3) {
          theNumber
        }
        fourth: promiseToChangeTheNumber(newNumber: 4) {
          theNumber
        },
        fifth: immediatelyChangeTheNumber(newNumber: 5) {
          theNumber
        }
        sixth: promiseAndFailToChangeTheNumber(newNumber: 6) {
          theNumber
        }
        subField {
          first: immediatelyChangeTheNumber(newNumber: 7) {
            theNumber
          },
          second: promiseToChangeTheNumber(newNumber: 8) {
            theNumber
          },
          third: failToChangeTheNumber(newNumber: 9) {
            theNumber
          }
          fourth: promiseToChangeTheNumber(newNumber: 10) {
            theNumber
          },
          fifth: immediatelyChangeTheNumber(newNumber: 11) {
            theNumber
          }
          sixth: promiseAndFailToChangeTheNumber(newNumber: 12) {
            theNumber
          }
        }
      }
    `);

    const rootValue = new Root(6);
    const result = await execute({ schema, document, rootValue });

    expect(result).to.deep.equal({
      data: {
        first: { theNumber: 1 },
        second: { theNumber: 2 },
        third: null,
        fourth: { theNumber: 4 },
        fifth: { theNumber: 5 },
        sixth: null,
        subField: {
          first: { theNumber: 7 },
          second: { theNumber: 8 },
          third: null,
          fourth: { theNumber: 10 },
          fifth: { theNumber: 11 },
          sixth: null,
        },
      },
      errors: [
        {
          message: 'Cannot change the number',
          locations: [{ line: 9, column: 9 }],
          path: ['third'],
        },
        {
          message: 'Cannot change the number',
          locations: [{ line: 18, column: 9 }],
          path: ['sixth'],
        },
        {
          message: 'Cannot change the number',
          locations: [{ line: 28, column: 11 }],
          path: ['subField', 'third'],
        },
        {
          message: 'Cannot change the number',
          locations: [{ line: 37, column: 11 }],
          path: ['subField', 'sixth'],
        },
      ],
    });
  });
});
