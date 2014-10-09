import DateTransform from 'fireplace/transforms/date';
import {
  transforms,
  serializes,
  deserializes
} from '../../helpers/transforms';

module('Transforms - date');

test('transforms dates', function() {
  var transform = DateTransform.create();

  transforms(transform, null,      null);
  transforms(transform, undefined, null);
  transforms(transform, 123,       null);

  var date = new Date(Date.UTC(1981, 7, 21, 12, 30));
  serializes(transform, date, "1981-08-21T12:30:00.000Z");
  deserializes(transform, "1981-08-21T12:30:00.000Z", date);
});