import NumberTransform from 'fireplace/transforms/number';
import { transforms } from '../../helpers/transforms';

module('Transforms - number');

test('transforms numbers', function() {
  var transform = NumberTransform.create();

  transforms(transform, "1",       1);
  transforms(transform, "0",       0);
  transforms(transform, 1,         1);
  transforms(transform, 0,         0);
  transforms(transform, "",        null);
  transforms(transform, null,      null);
  transforms(transform, undefined, null);
  transforms(transform, true,      1);
  transforms(transform, false,     0);
});