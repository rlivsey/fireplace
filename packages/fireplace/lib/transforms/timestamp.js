FP.TimestampTransform = FP.Transform.extend({
  deserialize: function(value) {
    if (!value) {
      return null;
    }
    return new Date(value);
  },

  serialize: function(value) {
    if (!value || !value.getTime) {
      return null;
    }
    return value.getTime();
  }
});