import Ember from 'ember';
import {deserialize} from '../transforms/base';

const get         = Ember.get;
const isNone      = Ember.isNone;

export default function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = 'string';
  }

  options = options || {};

  const meta = {
    type:        type,
    isAttribute: true,
    options:     options
  };

  return Ember.computed({
    get(name) {
      const container = get(this, 'container');
      const dataKey   = this.attributeKeyFromName(name);
      const snapshot  = get(this, 'snapshot');

      let value = snapshot.child(dataKey).val();

      if (isNone(value)) {
        value = getDefaultValue(this, options);
      } else {
        value = deserialize(this, value, meta, container);
      }

      return value;
    },

    set(name, value) {
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