/* global Firebase */

import Timestamp from 'fireplace/transforms/timestamp';
import {
  transforms,
  serializes,
  deserializes
} from '../../helpers/transforms';

module('Transforms - timestamp');

// MockFirebase doesn't have ServerValue
Firebase.ServerValue = Firebase.ServerValue || {};
Firebase.ServerValue.TIMESTAMP = Firebase.ServerValue.TIMESTAMP || {".sv": "timestamp"};

test('transforms timestamps', function() {
  var transform = Timestamp.create();

  transforms(transform, null,      null);
  transforms(transform, undefined, null);

  serializes(transform, Firebase.ServerValue.TIMESTAMP, Firebase.ServerValue.TIMESTAMP);

  var time = new Date(Date.UTC(1981, 7, 21, 12, 30));
  serializes(transform, time, 367245000000);
  deserializes(transform, 367245000000, time);
});