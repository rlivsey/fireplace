import expandPath from 'fireplace/utils/expand-path';

module('Utils - expandPath');

test('replaces placeholders from the provided context', function() {
  equal(expandPath("/foo/{{bar}}/baz", {bar: 123}), "/foo/123/baz");
});

test('replaces nested placeholders from the provided context', function() {
  equal(expandPath("/foo/{{foo.bar}}/baz", {foo: {bar: 123}}), "/foo/123/baz");
});

test('raises an error if a placeholder cannot be found', function() {
  throws(function() {
    expandPath("/foo/{{bar}}/baz", {baz: 123});
  });
});

test('ignores strings with no placeholders', function() {
  equal(expandPath("/foo/bar/baz"), "/foo/bar/baz");
});
