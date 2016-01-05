import {module, test} from 'qunit';
import HashTransform from 'fireplace/transforms/hash';
import TimestampTransform from 'fireplace/transforms/timestamp';
import '../../helpers/transforms';

module('Transforms - hash');

test('transforms plain hashes', function(assert) {
  const transform = HashTransform.create();

  assert.transforms(transform, null, null);
  assert.transforms(transform, undefined, null);

  assert.transforms(transform, {a: 1, b: 2}, {a: 1, b: 2});
});

test("transforms each item with specified transform", function(assert) {
  const transform = HashTransform.create();
  const container = {
    lookup() {
      return TimestampTransform.create();
    }
  };

  const date      = new Date(Date.UTC(1981, 7, 21, 12, 30));
  const timestamp = 367245000000;

  assert.deepEqual(transform.serialize({a: date}, {of: "timestamp"}, container), {a: timestamp});
  assert.deepEqual(transform.deserialize({a: timestamp}, {of: "timestamp"}, container), {a: date});
});