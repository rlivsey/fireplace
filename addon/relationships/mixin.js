import Ember from 'ember';

import {
  singularize
} from 'ember-inflector';

const get         = Ember.get;
const underscore  = Ember.String.underscore;

export const RelationshipsClassMixin = Ember.Mixin.create({
  relationships: Ember.computed(function() {
    const map = Ember.Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        meta.name = name;
        meta.key  = keyForRelationship(name, meta);
        meta.type = typeForRelationship(name, meta);
        map.set(name, meta);
      }
    });

    return map;
  }),

  relationshipsByKey: Ember.computed(function() {
    const map = Ember.Map.create();

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        meta.name = name;
        meta.key  = keyForRelationship(name, meta);
        meta.type = typeForRelationship(name, meta);
        map.set(meta.key, meta);
      }
    });

    return map;
  }),

  relationshipNameFromKey(key) {
    const meta = get(this, 'relationshipsByKey').get(key);
    return meta && meta.name;
  },

  relationshipKeyFromName(name) {
    const meta = get(this, 'relationships').get(name);
    return meta && meta.key;
  }
});

export const RelationshipsMixin = Ember.Mixin.create({
  relationshipNameFromKey(key) {
    return this.constructor.relationshipNameFromKey(key);
  },

  relationshipKeyFromName(name) {
    return this.constructor.relationshipKeyFromName(name);
  }
});

function keyForRelationship(name, meta) {
  if (meta && meta.options.key) {
    return meta.options.key;
  } else {
    return underscore(name);
  }
}

function typeForRelationship(name, meta) {
  let type = meta.type;

  if (!type && meta.kind === 'hasMany') {
    type = singularize(name);
  } else if (!type) {
    type = name;
  }

  return type;
}