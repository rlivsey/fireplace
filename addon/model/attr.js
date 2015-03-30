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

  return Ember.computed({
    get: function(name) {
      var container = get(this, 'container');
      var dataKey   = this.attributeKeyFromName(name);
      var snapshot  = get(this, 'snapshot');
      var value     = snapshot.child(dataKey).val();

      if (isNone(value)) {
        value = getDefaultValue(this, options);
      } else {
        value = deserialize(this, value, meta, container);
      }

      return value;
    },

    set: function(name, value) {
      if (isNone(value)) {
        value = getDefaultValue(this, options);
      }
      return value;
    }
  }).meta(meta);
}

function getDefaultValue(obj, options) {
  if (typeof options.default === 'function') {
    return options.default.call(obj);
  } else {
    return options.default;
  }
}