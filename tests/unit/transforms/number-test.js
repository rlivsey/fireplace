import NumberTransform from 'fireplace/transforms/number';
import {module, test} from 'qunit';
import '../../helpers/transforms';

module('Transforms - number');

test('transforms numbers', function(assert) {
  const transform = NumberTransform.create();

  assert.transforms(transform, "1",       1);
  assert.transforms(transform, "0",       0);
  assert.transforms(transform, 1,         1);
  assert.transforms(transform, 0,         0);
  assert.transforms(transform, "",        null);
  assert.transforms(transform, null,      null);
  assert.transforms(transform, undefined, null);
  assert.transforms(transform, true,      1);
  assert.transforms(transform, false,     0);
});