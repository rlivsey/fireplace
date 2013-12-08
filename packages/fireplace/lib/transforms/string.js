var none = Ember.isNone;

FP.StringTransform = FP.Transform.extend({

  deserialize: function(serialized) {
    return none(serialized) ? null : String(serialized);
  },

  serialize: function(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  }

});