import Ember from 'ember';

import MutableSnapshot from '../support/mutable-snapshot';
import { serialize } from '../transforms/base';

import LiveMixin from './live-mixin';
import {
  AttributesClassMixin,
  AttributesMixin
} from './attributes-mixin';
import {
  RelationshipsClassMixin,
  RelationshipsMixin
} from '../relationships/mixin';

// Map#forEach argument order changed - https://github.com/emberjs/data/issues/2323
var LEGACY_MAP = Ember.Map.prototype.forEach.length === 2;

var get       = Ember.get;
var set       = Ember.set;
var cacheFor  = Ember.cacheFor;
var isNone    = Ember.isNone;

export var ModelClassMixin = Ember.Mixin.create(AttributesClassMixin, RelationshipsClassMixin);

export var ModelMixin = Ember.Mixin.create(LiveMixin, AttributesMixin, RelationshipsMixin, Ember.Evented, {
  firebaseEvents: ['child_added', 'child_removed', 'child_changed'],

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
      if (value instanceof MutableSnapshot) {
        value = value.snapshot;
      }
      set(this, "_snapshot", value);
      snapshot = value;
    } else {
      snapshot = get(this, "_snapshot");
    }
    return new MutableSnapshot(snapshot);
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

  eachActiveRelation: function(cb) {
    var item;
    get(this.constructor, 'relationships').forEach(function(name/*, meta */) {
      item = cacheFor(this, name);
      if (item) { cb(item); }
    }, this);
  },

  listenToFirebase: function() {
    if (!get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(function(item) {
        item.listenToFirebase();
      });
    }
    return this._super();
  },

  stopListeningToFirebase: function() {
    if (get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(function(item) {
        item.stopListeningToFirebase();
      });
    }
    return this._super();
  },

  setAttributeFromSnapshot: function(snapshot, valueRemoved) {
    var key       = snapshot.name();
    var attribute = this.attributeNameFromKey(key);
    if (!attribute) { return; }

    var current     = get(this, "snapshot"),
        currentData = current.child(key).val(),
        newVal;

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      newVal   = null;
      snapshot = null;
    } else {
      newVal = snapshot.val();
    }

    // don't bother triggering a property change if nothing has changed
    // eg if we've got a snapshot & then started listening
    if (currentData === newVal) {
      return;
    }

    current.setChild(key, snapshot);

    this.settingFromFirebase(function(){
      this.notifyPropertyChange(attribute);
    });
  },

  notifyRelationshipOfChange: function(snapshot, valueRemoved) {
    var key       = snapshot.name();
    var attribute = this.relationshipNameFromKey(key);

    if (!attribute) { return; }

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      snapshot = null;
    }

    get(this, "snapshot").setChild(key, snapshot);

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
    this.setAttributeFromSnapshot(snapshot, true);
    this.notifyRelationshipOfChange(snapshot, true);
  },

  onFirebaseChildChanged: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
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
        snapshot      = get(this, "_snapshot"),
        json          = {},
        key, value;

    attributes.forEach(function(meta, name) {
      if (LEGACY_MAP) { var tmp = name; name = meta; meta = tmp; }

      value = get(this, name);
      // Firebase doesn't like null values, so remove them
      if (isNone(value)) { return; }

      json[this.attributeKeyFromName(name)] = serialize(this, value, meta, container);
    }, this);

    relationships.forEach(function(meta, name) {
      if (LEGACY_MAP) { var tmp = name; name = meta; meta = tmp; }

      // we don't serialize detached relationships
      if (meta.options.detached) { return; }

      key = this.relationshipKeyFromName(name);

      // if we haven't loaded the relationship yet, get the data from the snapshot
      // no point materializing something we already know the data of
      value = cacheFor(this, name);

      if (value === undefined && snapshot) {
        value = snapshot.child(key).exportVal();
      } else if (isNone(value)) {
        // Firebase doesn't like null values, so remove them
        return;
      } else {
        // TODO - ideally we shouldn't have to know about these details here
        // can we farm this off to a function on the relationship?
        if (meta.kind === "hasOne" && meta.options.embedded === false) {
          value = get(value, "id");
        } else {
          value = value.toFirebaseJSON(true);
        }
      }

      json[key] = value;
    }, this);

    return includePriority ? this.wrapValueAndPriority(json) : json;
  },

  wrapValueAndPriority: function(json) {
    var priority = get(this, 'priority');
    if (isNone(priority)) {
      return json;
    }

    return {
      '.value':    json,
      '.priority': priority
    };
  }

});