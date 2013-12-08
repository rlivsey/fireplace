FP.Transform = Ember.Object.extend({
  serialize:   Ember.required(),
  deserialize: Ember.required()
});

FP.Transform.reopenClass({
  deserialize: function(obj, value, meta, container) {
    return FP.Transform.transform("deserialize", obj, value, meta, container);
  },

  serialize: function(obj, value, meta, container) {
    return FP.Transform.transform("serialize", obj, value, meta, container);
  },

  transform: function(kind, obj, value, meta, container) {
    var type    = meta.type;
    var options = meta.options;

    if (options[kind]) {
      return options[kind].call(obj, value);
    }

    if (!type || !container) {
      return value;
    }

    var transform = container.lookup('transform:'+type);
    if (!transform) {
      return value;
    }

    return transform[kind](value, options, container);
  }
});
