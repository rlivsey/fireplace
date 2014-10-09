import Transform from './base';

export default Transform.extend({
  deserialize: function(serialized) {
    return Boolean(serialized);
  },

  serialize: function(deserialized) {
    return Boolean(deserialized);
  }
});
