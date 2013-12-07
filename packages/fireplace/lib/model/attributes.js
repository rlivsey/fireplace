require('fireplace/transforms');

var get        = Ember.get,
    deserialize= FP.Transform.deserialize;

FP.attr = function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = 'string';
  }

  options = options || {};

  var meta = {
    type:        type,
    isAttribute: true,
    options:     options
  };

  return Ember.computed(function(name, value) {
    var container = get(this, 'container');
    if (arguments.length > 1 && value !== null && value !== undefined) {
      return deserialize(this, value, meta, container);
    }

    var dataKey  = this.attributeKeyFromName(name),
        snapshot = get(this, 'snapshot');

    value = snapshot && snapshot.val()[dataKey];

    if (value === null || value === undefined) {
      value = getDefaultValue(this, options);
    } else {
      value = deserialize(this, value, meta, container);
    }

    return value;
  }).property().meta(meta);
};

function getDefaultValue(obj, options) {
  if (typeof options.default === 'function') {
    return options.default.call(obj);
  } else {
    return options.default;
  }
}