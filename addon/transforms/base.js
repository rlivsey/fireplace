import Ember from 'ember';

export default Ember.Object.extend({
  serialize:   null,
  deserialize: null
});

export function deserialize(obj, value, meta, container) {
  return transform("deserialize", obj, value, meta, container);
}

export function serialize(obj, value, meta, container) {
  return transform("serialize", obj, value, meta, container);
}

export function transform(kind, obj, value, meta, container) {
  var type    = meta.type;
  var options = meta.options;

  if (options[kind]) {
    return options[kind].call(obj, value);
  }

  if (!type || !container) {
    return value;
  }

  var transformer = container.lookup('transform:'+type);
  if (!transformer) {
    return value;
  }

  return transformer[kind](value, options, container);
}
