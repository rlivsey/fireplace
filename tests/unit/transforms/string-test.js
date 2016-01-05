import StringTransform from 'fireplace/transforms/string';
import {module, test} from 'qunit';
import '../../helpers/transforms';

module('Transforms - string');

test('transforms strings', function(assert) {
  const transform = StringTransform.create();

  assert.transforms(transform, "Scumbag Livsey", "Scumbag Livsey", "leaves strings alone");
  assert.transforms(transform, 1, "1",                             "converts numbers to strings");
  assert.transforms(transform, "", "",                             "leaves blank strings blank");
  assert.transforms(transform, null, null,                         "leaves nulls as null");
  assert.transforms(transform, undefined, null,                    "converts undefined to null");
  assert.transforms(transform, false, "false",                     "converts false to string");
  assert.transforms(transform, true, "true",                       "converts true to string");
});