import Ember from 'ember';
import { singularize } from 'ember-inflector';

var get        = Ember.get;
var underscore = Ember.String.underscore;

export var RelationshipsClassMixin = Ember.Mixin.create({
  relationships: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
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
    var map = Ember.Map.create(), key;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        meta.name = name;
        meta.key  = key = keyForRelationship(name, meta);
        meta.type = typeForRelationship(name, meta);
        map.set(key, meta);
      }
    });

    return map;
  }),

  relationshipNameFromKey: function(key) {
    var meta = get(this, 'relationshipsByKey').get(key);
    return meta && meta.name;
  },

  relationshipKeyFromName: function(name) {
    var meta = get(this, 'relationships').get(name);
    return meta && meta.key;
  }
});

export var RelationshipsMixin = Ember.Mixin.create({
  relationshipNameFromKey: function(key) {
    return this.constructor.relationshipNameFromKey(key);
  },

  relationshipKeyFromName: function(name) {
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
  var type = meta.type;

  if (!type && meta.kind === 'hasMany') {
    type = singularize(name);
  } else if (!type) {
    type = name;
  }

  return type;
}