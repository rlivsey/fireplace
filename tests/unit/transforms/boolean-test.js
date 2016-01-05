import BooleanTransform from 'fireplace/transforms/boolean';
import {module, test} from 'qunit';
import '../../helpers/transforms';

module('Transforms - boolean');

test('transforms booleans', function(assert) {
  const transform = BooleanTransform.create();

  assert.transforms(transform, "1",        true);
  assert.transforms(transform, "",         false);
  assert.transforms(transform, 1,          true);
  assert.transforms(transform, 0,          false);
  assert.transforms(transform, null,       false);
  assert.transforms(transform, undefined,  false);
  assert.transforms(transform, true,       true);
  assert.transforms(transform, false,      false);
});