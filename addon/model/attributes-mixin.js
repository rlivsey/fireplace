import Ember from 'ember';

const get        = Ember.get;
const underscore = Ember.String.underscore;

export const AttributesClassMixin = Ember.Mixin.create({
  attributes: Ember.computed(function() {
    const map = Ember.Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isAttribute) {
        meta.name = name;
        meta.key  = keyForAttribute(name, meta);
        map.set(name, meta);
      }
    });

    return map;
  }),

  attributesByKey: Ember.computed(function(){
    const map = Ember.Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isAttribute) {
        meta.name = name;
        meta.key  = keyForAttribute(name, meta);
        map.set(meta.key, meta);
      }
    });

    return map;
  }),

  eachAttribute(callback, binding) {
    get(this, 'attributes').forEach((meta, name) => {
      callback.call(binding, name, meta);
    });
  },

  attributeNameFromKey(key) {
    const meta = get(this, 'attributesByKey').get(key);
    return meta && meta.name;
  },

  attributeKeyFromName(name) {
    const meta = get(this, 'attributes').get(name);
    return meta && meta.key;
  }
});

export const AttributesMixin = Ember.Mixin.create({
  eachAttribute(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  },

  attributeNameFromKey(key) {
    return this.constructor.attributeNameFromKey(key);
  },

  attributeKeyFromName(key) {
    return this.constructor.attributeKeyFromName(key);
  }
});

function keyForAttribute(name, meta) {
  if (meta && meta.options.key) {
    return meta.options.key;
  } else {
    return underscore(name);
  }
}