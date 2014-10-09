import Transform from './base';

export default Transform.extend({
  serialize: function(hash, options, container) {
    return transformHash("serialize", hash, options, container);
  },

  deserialize: function(hash, options, container) {
    return transformHash("deserialize", hash, options, container);
  }
});

function transformHash(direction, hash, options, container) {
  if (!hash) {
    return null;
  }

  if (!options || !options.of) {
    return hash;
  }

  var transform = container.lookup('transform:'+options.of);

  var transformed = {};
  var key;
  for (key in hash) {
    transformed[key] = transform[direction](hash[key], options, container);
  }
  return transformed;
}