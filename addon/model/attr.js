import Ember from 'ember';
import {deserialize} from '../transforms/base';
import getOwner from 'ember-getowner-polyfill';

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
      const dataKey   = this.attributeKeyFromName(name);
      const snapshot  = get(this, 'snapshot');

      let value = snapshot.child(dataKey).val();

      if (isNone(value)) {
        value = getDefaultValue(this, options);
      } else {

        // default MODEL_FACTORY_INJECTIONS setting means the model doesn't have an owner
        // we could set this to true, but that would break Ember Data should you be using both
        // so get the store's owner instead and use that

        const store     = get(this, "store");
        const container = getOwner(store);

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