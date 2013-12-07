FP.NumberTransform    = FP.Transform.extend({
  deserialize: function(value) {
    if (!value && value !== 0) {
      return null;
    }
    return Number(value);
  },

  serialize: function(value) {
    if (!value && value !== 0) {
      return null;
    }
    return Number(value);
  }
});