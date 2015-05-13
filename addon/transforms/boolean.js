import Transform from './base';

export default Transform.extend({
  deserialize(serialized) {
    return Boolean(serialized);
  },

  serialize(deserialized) {
    return Boolean(deserialized);
  }
});
