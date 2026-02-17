import * as chai from '../../index.js';

/**
 *
 * @param expr
 * @param msg
 */
function assert (expr, msg) {
  if (!expr) {
    throw new Error(msg || 'Assertion Failed');
  }
}

const type = chai.util.type

const isNode = typeof process !== 'undefined' && typeof process.release === 'object' && process.release.name;
/**
 *
 * @param condition
 */
function describeIf(condition) {
  return condition ? describe : describe.skip;
}
describeIf(isNode)('Node Specific', () => {

  it('global', () => {
    assert(type(global) === 'global');
  });

  it('process', () => {
    assert(type(process) === 'process');
  });

});
