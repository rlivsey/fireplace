FP.ArrayTransform = FP.Transform.extend({
  serialize: function(array, options, container) {
    return transformArray("serialize", array, options, container);
  },

  deserialize: function(array, options, container) {
    return transformArray("deserialize", array, options, container);
  }
});

function transformArray(direction, array, options, container) {
  if (!array) {
    return null;
  }

  if (!options || !options.of) {
    return array;
  }

  var transform = container.lookup('transform:'+options.of);

  return array.map(function (value) {
    return transform[direction](value, options, container);
  });
}
