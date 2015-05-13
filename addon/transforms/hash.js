import Transform from './base';

export default Transform.extend({
  serialize(hash, options, container) {
    return transformHash("serialize", hash, options, container);
  },

  deserialize(hash, options, container) {
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

  const transform = container.lookup('transform:'+options.of);

  const transformed = {};
  for (let key in hash) {
    transformed[key] = transform[direction](hash[key], options, container);
  }
  return transformed;
}