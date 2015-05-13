import DateTransform from 'fireplace/transforms/date';
import {module, test} from 'qunit';
import '../../helpers/transforms';

module('Transforms - date');

test('transforms dates', function(assert) {
  var transform = DateTransform.create();

  assert.transforms(transform, null,      null);
  assert.transforms(transform, undefined, null);
  assert.transforms(transform, 123,       null);

  var date = new Date(Date.UTC(1981, 7, 21, 12, 30));
  assert.serializes(transform, date, "1981-08-21T12:30:00.000Z");
  assert.deserializes(transform, "1981-08-21T12:30:00.000Z", date);
});