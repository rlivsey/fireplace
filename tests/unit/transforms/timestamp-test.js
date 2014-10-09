import Timestamp from 'fireplace/transforms/timestamp';
import {
  transforms,
  serializes,
  deserializes
} from '../../helpers/transforms';

module('Transforms - timestamp');

test('transforms timestamps', function() {
  var transform = Timestamp.create();

  transforms(transform, null,      null);
  transforms(transform, undefined, null);

  var time = new Date(Date.UTC(1981, 7, 21, 12, 30));
  serializes(transform, time, 367245000000);
  deserializes(transform, 367245000000, time);
});