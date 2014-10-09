import StringTransform from 'fireplace/transforms/string';
import { transforms } from '../../helpers/transforms';

module('Transforms - string');

test('transforms strings', function() {
  var transform = StringTransform.create();

  transforms(transform, "Scumbag Livsey", "Scumbag Livsey", "leaves strings alone");
  transforms(transform, 1, "1",                             "converts numbers to strings");
  transforms(transform, "", "",                             "leaves blank strings blank");
  transforms(transform, null, null,                         "leaves nulls as null");
  transforms(transform, undefined, null,                    "converts undefined to null");
  transforms(transform, false, "false",                     "converts false to string");
  transforms(transform, true, "true",                       "converts true to string");
});