import Ember from 'ember';
import {deserialize} from '../transforms/base';

var get         = Ember.get;
var isNone      = Ember.isNone;

export default function(type, options) {
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
    if (arguments.length > 1) {
      if (isNone(value)) {
        value = getDefaultValue(this, options);
      }
      return value;
    }

    var dataKey  = this.attributeKeyFromName(name),
        snapshot = get(this, 'snapshot');

    value = snapshot.child(dataKey).val();

    if (isNone(value)) {
      value = getDefaultValue(this, options);
    } else {
      value = deserialize(this, value, meta, container);
    }

    return value;
  }).property().meta(meta);
}

function getDefaultValue(obj, options) {
  if (typeof options.default === 'function') {
    return options.default.call(obj);
  } else {
    return options.default;
  }
}