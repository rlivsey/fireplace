import BooleanTransform from 'fireplace/transforms/boolean';
import { transforms } from '../../helpers/transforms';

module('Transforms - boolean');

test('transforms booleans', function() {
  var transform = BooleanTransform.create();

  transforms(transform, "1",        true);
  transforms(transform, "",         false);
  transforms(transform, 1,          true);
  transforms(transform, 0,          false);
  transforms(transform, null,       false);
  transforms(transform, undefined,  false);
  transforms(transform, true,       true);
  transforms(transform, false,      false);
});