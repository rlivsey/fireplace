require('fireplace/transforms');

require('fireplace/relationships/relationships_mixin');

require('fireplace/model/live_mixin');
require('fireplace/model/attributes_mixin');
require('fireplace/model/mutable_snapshot');

var get       = Ember.get,
    set       = Ember.set,
    serialize = FP.Transform.serialize;

FP.ModelClassMixin = Ember.Mixin.create(FP.AttributesClassMixin, FP.RelationshipsClassMixin);

FP.ModelMixin = Ember.Mixin.create(FP.LiveMixin, FP.AttributesMixin, FP.RelationshipsMixin, {
  firebaseEvents: ['child_added', 'child_removed', 'child_changed', 'value'],

  store: null,

  isNew: Ember.computed(function(){
    return !get(this, "_snapshot");
  }).property("_snapshot"),

  // the actual Firebase::Snapshot, can be null if new record
  _snapshot: null,

  // wrapped MutableSnapshot, will never be null
  snapshot: Ember.computed(function(key, value) {
    var snapshot;
    if (arguments.length > 1) {
      set(this, "_snapshot", value);
      snapshot = value;
    } else {
      snapshot = get(this, "_snapshot");
    }
    return new FP.MutableSnapshot(snapshot);
  }).property("_snapshot"),

  willDestroy: function() {
    var store = get(this, "store");
    store.teardownRecord(this);

    var parent = get(this, "parent"),
        parentKey = get(this, "parentKey");

    // TODO - remove this knowledge from here
    // Ember data does this with registered collections etc...
    if (parent && !parent.isDestroyed && !parent.isDestroying) {
      if (parent && parentKey) {
        set(parent, parentKey, null);
      } else {
        parent.removeObject(this);
      }
    }

    this._super();
  },

  eachRelatedItem: function(cb) {
    var item;
    get(this.constructor, 'relationships').forEach(function(name, meta) {
      item = get(this, name);
      if (item) { cb(item); }
    }, this);
  },

  listenToFirebase: function() {
    this.eachRelatedItem(function(item) {
      item.listenToFirebase();
    });
    return this._super();
  },

  stopListeningToFirebase: function() {
    this.eachRelatedItem(function(item) {
      item.stopListeningToFirebase();
    });
    return this._super();
  },

  setAttributeFromSnapshot: function(snapshot) {
    var key       = snapshot.name();
    var attribute = this.attributeNameFromKey(key);
    if (!attribute) { return; }

    get(this, "snapshot").set(key, snapshot.val());

    this.settingFromFirebase(function(){
      this.notifyPropertyChange(attribute);
    });
  },

  notifyRelationshipOfChange: function(snapshot) {
    var key       = snapshot.name();
    var attribute = this.relationshipNameFromKey(key);

    if (!attribute) { return; }

    get(this, "snapshot").set(key, snapshot.val());

    var meta = this.constructor.metaForProperty(attribute);
    if (meta.kind === "hasOne") {
      this.settingFromFirebase(function(){
        this.notifyPropertyChange(attribute);
      });
    }
  },

  onFirebaseChildAdded: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseChildRemoved: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseChildChanged: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    // don't need to notify relationships as they handle changes
  },

  onFirebaseValue: function(snapshot) {
    // apparently we don't exist
    if (snapshot && !snapshot.val()) {
      this.destroy();
    } else {
      set(this, "_snapshot", snapshot);
    }
  },

  update: function(key, value) {
    set(this, key, value);
    return this.save(key);
  },

  save: function(key) {
    return get(this, 'store').saveRecord(this, key);
  },

  delete: function() {
    return get(this, 'store').deleteRecord(this);
  },

  toFirebaseJSON: function(includePriority) {
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships'),
        container     = get(this, "container"),
        json          = {},
        value;

    attributes.forEach(function(name, meta){
      value = get(this, name);
      // Firebase doesn't like null values, so remove them
      if (value === undefined || value === null) { return; }

      json[this.attributeKeyFromName(name)] = serialize(this, value, meta, container);
    }, this);

    relationships.forEach(function(name, meta){
      // we don't serialize detached relationships
      if (meta.options.detached) { return; }

      // TODO - use cacheFor to see if we've built the association already
      // if not, we could just use snapshot.val() / .exportVal() which is already serialized
      // instead of building the associated objects
      value = get(this, name);

      // Firebase doesn't like null values, so remove them
      if (value === undefined || value === null) { return; }

      // TODO - indexed associations need to just include the ID
      json[this.relationshipKeyFromName(name)] = value.toFirebaseJSON(true);
    }, this);

    return includePriority ? this.wrapValueAndPriority(json) : json;
  },

  wrapValueAndPriority: function(json) {
    var priority = get(this, 'priority');
    if (priority === undefined || priority === null) {
      return json;
    }

    return {
      '.value':    json,
      '.priority': priority
    };
  }

});