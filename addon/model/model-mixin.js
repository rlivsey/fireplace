import Ember from 'ember';

import getOwner from 'ember-getowner-polyfill';

import MutableSnapshot from '../support/mutable-snapshot';
import { serialize } from '../transforms/base';
import deepEqual from '../utils/deep-equal';

import LiveMixin from './live-mixin';
import {
  AttributesClassMixin,
  AttributesMixin
} from './attributes-mixin';
import {
  RelationshipsClassMixin,
  RelationshipsMixin
} from '../relationships/mixin';

const get       = Ember.get;
const set       = Ember.set;
const cacheFor  = Ember.cacheFor;
const isNone    = Ember.isNone;

export const ModelClassMixin = Ember.Mixin.create(AttributesClassMixin, RelationshipsClassMixin);

export const ModelMixin = Ember.Mixin.create(LiveMixin, AttributesMixin, RelationshipsMixin, Ember.Evented, {
  firebaseEvents: ['child_added', 'child_removed', 'child_changed'],

  store: null,

  isNew: Ember.computed.not("_snapshot"),

  // the actual Firebase::Snapshot, can be null if new record
  _snapshot: null,

  // wrapped MutableSnapshot, will never be null
  snapshot: Ember.computed("_snapshot", {
    get() {
      const snapshot = get(this, "_snapshot");
      return new MutableSnapshot(snapshot);
    },
    set(key, value) {
      if (value instanceof MutableSnapshot) {
        value = value.snapshot;
      }
      set(this, "_snapshot", value);
      return new MutableSnapshot(value);
    }
  }),

  willDestroy() {
    const store = get(this, "store");
    store.teardownRecord(this);

    const parent = get(this, "parent");
    const parentKey = get(this, "parentKey");

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

  eachActiveRelation(cb) {
    get(this.constructor, 'relationships').forEach((meta, name) => {
      const item = cacheFor(this, name);
      if (item) { cb(item); }
    });
  },

  listenToFirebase() {
    if (!get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(item => item.listenToFirebase() );
    }
    return this._super();
  },

  stopListeningToFirebase() {
    if (get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(item => item.stopListeningToFirebase() );
    }
    return this._super();
  },

  setAttributeFromSnapshot(snapshot, valueRemoved) {
    const key       = snapshot.key();
    const attribute = this.attributeNameFromKey(key);
    if (!attribute) { return; }

    const current     = get(this, "snapshot");
    const currentData = current.child(key).val();

    let newVal;

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      newVal   = null;
      snapshot = null;
    } else {
      newVal = snapshot.val();
    }

    // don't bother triggering a property change if nothing has changed
    // eg if we've got a snapshot & then started listening
    // do deep comparison in-case this is a hash type
    if (deepEqual(currentData, newVal)) {
      return;
    }

    current.setChild(key, snapshot);

    this.settingFromFirebase(() => this.notifyPropertyChange(attribute) );
  },

  notifyRelationshipOfChange(snapshot, valueRemoved) {
    const key       = snapshot.key();
    const attribute = this.relationshipNameFromKey(key);

    if (!attribute) { return; }

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      snapshot = null;
    }

    get(this, "snapshot").setChild(key, snapshot);

    const meta = this.constructor.metaForProperty(attribute);
    if (meta.kind === "hasOne") {
      this.settingFromFirebase(() => this.notifyPropertyChange(attribute) );
    }
  },

  onFirebaseChildAdded(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseChildRemoved(snapshot) {
    this.setAttributeFromSnapshot(snapshot, true);
    this.notifyRelationshipOfChange(snapshot, true);
  },

  onFirebaseChildChanged(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseValue(snapshot) {
    // apparently we don't exist
    if (snapshot && !snapshot.val()) {
      this.destroy();
    } else {
      set(this, "_snapshot", snapshot);
    }
  },

  update(key, value) {
    set(this, key, value);
    return this.save(key);
  },

  save(key) {
    return get(this, 'store').saveRecord(this, key);
  },

  delete() {
    return get(this, 'store').deleteRecord(this);
  },

  toFirebaseJSON(includePriority) {
    const attributes    = get(this.constructor, 'attributes');
    const relationships = get(this.constructor, 'relationships');
    const snapshot      = get(this, "_snapshot");
    const json          = {};

    // default MODEL_FACTORY_INJECTIONS setting means the model doesn't have an owner
    // we could set this to true, but that would break Ember Data should you be using both
    // so get the store's owner instead and use that

    const store     = get(this, "store");
    const container = getOwner(store);

    attributes.forEach((meta, name) => {
      const value = get(this, name);
      // Firebase doesn't like null values, so remove them
      if (isNone(value)) { return; }

      json[this.attributeKeyFromName(name)] = serialize(this, value, meta, container);
    });

    relationships.forEach((meta, name) => {
      // we don't serialize detached relationships
      if (meta.options.detached) { return; }

      const key = this.relationshipKeyFromName(name);

      // if we haven't loaded the relationship yet, get the data from the snapshot
      // no point materializing something we already know the data of
      const item = cacheFor(this, name);

      let value;

      if (item === undefined && snapshot) {
        value = snapshot.child(key).exportVal();
      } else if (isNone(item)) {
        // Firebase doesn't like null values, so remove them
        return;
      } else {
        // TODO - ideally we shouldn't have to know about these details here
        // can we farm this off to a function on the relationship?
        if (meta.kind === "hasOne") {
          if (meta.options.embedded === false) {
            value = get(item, "id");
          } else if (meta.options.id) {
            value = item.toFirebaseJSON(true);
            value.id = get(item, "id");
          } else {
            value = item.toFirebaseJSON(true);
          }
        } else {
          value = item.toFirebaseJSON(true);
        }
      }

      json[key] = value;
    });

    return includePriority ? this.wrapValueAndPriority(json) : json;
  },

  wrapValueAndPriority(json) {
    const priority = get(this, 'priority');
    if (isNone(priority)) {
      return json;
    }

    return {
      '.value':    json,
      '.priority': priority
    };
  }

});