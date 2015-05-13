/* global Firebase */

import Timestamp from 'fireplace/transforms/timestamp';
import {module, test} from 'qunit';
import { now } from 'fireplace/transforms/timestamp';
import '../../helpers/transforms';

module('Transforms - timestamp');

// MockFirebase doesn't have ServerValue
Firebase.ServerValue = Firebase.ServerValue || {};
Firebase.ServerValue.TIMESTAMP = Firebase.ServerValue.TIMESTAMP || {".sv": "timestamp"};

test('export now as Firebase.ServerValue.TIMESTAMP', function(assert) {
  assert.equal(now(), Firebase.ServerValue.TIMESTAMP);
});

test('transforms timestamps', function(assert) {
  var transform = Timestamp.create();

  assert.transforms(transform, null,      null);
  assert.transforms(transform, undefined, null);

  assert.serializes(transform, Firebase.ServerValue.TIMESTAMP, Firebase.ServerValue.TIMESTAMP);

  var time = new Date(Date.UTC(1981, 7, 21, 12, 30));
  assert.serializes(transform, time, 367245000000);
  assert.deserializes(transform, 367245000000, time);
});