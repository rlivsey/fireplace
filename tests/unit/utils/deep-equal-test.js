import deepEqual from 'fireplace/utils/deep-equal';

import {module, test} from 'qunit';

module('Utils - deepEqual');

test('simple equal things are equal', function(assert) {
  assert.ok(deepEqual('a', 'a'));
});

test('different types are not equal', function(assert) {
  assert.ok(!deepEqual('1', 1));
});

test('equal objects are equal', function(assert) {
  assert.ok(deepEqual({a: 1}, {a: 1}));
});

test('objects with different properties are not equal', function(assert) {
  assert.ok(!deepEqual({a: 1, b: 2}, {a: 1}));
  assert.ok(!deepEqual({a: 1}, {a: 1, b: 2}));
});

test('deeply nested equal objects are equal', function(assert) {
  assert.ok(deepEqual({a: {b: 1}}, {a: {b: 1}}));
});

test('deeply nested unequal objects are not equal', function(assert) {
  assert.ok(!deepEqual({a: {b: 1}}, {a: {b: 2}}));
});