import Ember from 'ember';
import HashTransform from 'fireplace/transforms/hash';
import TimestampTransform from 'fireplace/transforms/timestamp';
import { transforms } from '../../helpers/transforms';

module('Transforms - hash');

test('transforms plain hashes', function() {
  var transform = HashTransform.create();

  transforms(transform, null, null);
  transforms(transform, undefined, null);

  transforms(transform, {a: 1, b: 2}, {a: 1, b: 2});
});

test("transforms each item with specified transform", function() {
  var transform = HashTransform.create();
  var container = new Ember.Container();

  container.register('transform:timestamp', TimestampTransform);

  var date      = new Date(Date.UTC(1981, 7, 21, 12, 30));
  var timestamp = 367245000000;

  deepEqual(transform.serialize({a: date}, {of: "timestamp"}, container), {a: timestamp});
  deepEqual(transform.deserialize({a: timestamp}, {of: "timestamp"}, container), {a: date});
});