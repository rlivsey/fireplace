import expandPath from 'fireplace/utils/expand-path';

import {module, test} from 'qunit';

module('Utils - expandPath');

test('replaces placeholders from the provided context', function(assert) {
  assert.equal(expandPath("/foo/{{bar}}/baz", {bar: 123}), "/foo/123/baz");
});

test('replaces nested placeholders from the provided context', function(assert) {
  assert.equal(expandPath("/foo/{{foo.bar}}/baz", {foo: {bar: 123}}), "/foo/123/baz");
});

test('raises an error if a placeholder cannot be found', function(assert) {
  assert.throws(function() {
    expandPath("/foo/{{bar}}/baz", {baz: 123});
  });
});

test('ignores strings with no placeholders', function(assert) {
  assert.equal(expandPath("/foo/bar/baz"), "/foo/bar/baz");
});
