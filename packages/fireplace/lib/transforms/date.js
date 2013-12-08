require('fireplace/ext/date-parse');

FP.DateTransform = FP.Transform.extend({
  deserialize: function(value) {
    if (!value || typeof value !== "string") {
      return null;
    }
    return new Date(Ember.Date.parse(value));
  },

  serialize: function(value) {
    if (!value || !value.toISOString) {
      return null;
    }
    return value.toISOString();
  }
});