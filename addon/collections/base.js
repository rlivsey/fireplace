import Ember from 'ember';

import LiveMixin from '../model/live-mixin';

const get           = Ember.get;
const set           = Ember.set;
const getProperties = Ember.getProperties;

export default Ember.ArrayProxy.extend(LiveMixin, {
  firebaseEvents: ['child_added', 'child_removed', 'child_moved'],

  model:     null,
  parent:    null,
  parentKey: null,
  snapshot:  null,
  query:     null,

  // filtering
  startAt: null,
  endAt:   null,
  limit:   null,

  onFirebaseChildAdded:   null,
  onFirebaseChildRemoved: null,
  onFirebaseChildMoved:   null,
  toFirebaseJSON:         null,

  isNew: Ember.computed("snapshot", function(){
    return !get(this, "snapshot");
  }),

  firebaseReference: null,

  debugReference: Ember.computed(function(){
    return this.buildFirebaseReference().toString();
  }),

  buildFirebaseReference() {
    // do we have an explicit reference?
    const ref = get(this, 'firebaseReference');
    if (ref) {
      return ref;
    }

    // do we have an explicit path to build from?
    const path  = get(this, 'firebasePath');
    const store = get(this, 'store');

    if (path) {
      const rootRef = store.buildFirebaseRootReference();
      return rootRef.child(path);
    }

    // are we an embedded collection in a relationship?
    const parent    = get(this, 'parent');
    const parentKey = get(this, 'parentKey');

    if (parent && parentKey) {
      const childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    // otherwise we're a root collection, use the model reference
    const modelName  = get(this, 'model');
    const modelClass = store.modelFor(modelName);

    return modelClass.buildFirebaseReference(store);
  },

  buildFirebaseQuery() {
    let reference = this.buildFirebaseReference();
    const options = getProperties(this, 'startAt', 'endAt', 'limit');

    if (options.startAt) {
      reference = reference.startAt(options.startAt);
    }

    if (options.endAt) {
      reference = reference.endAt(options.endAt);
    }

    if (options.limit) {
      reference = reference.limit(options.limit);
    }

    return reference;
  },

  save() {
    return this.store.saveCollection(this);
  },

  modelClassFromSnapshot(snap) {
    const modelName = get(this, 'model');
    const baseClass = this.store.modelFor(modelName);
    return baseClass.typeFromSnapshot(snap);
  },

  onFirebaseValue(snapshot) {
    set(this, "snapshot", snapshot);
  },

  setupContent: Ember.on('init', function() {
    if (!get(this, 'content')) {
      set(this, 'content', Ember.A());
    }
  }),

  insertAfter(prevItemName, item, collection) {
    collection = collection || this;

    let previous;
    let previousIndex;

    if (prevItemName) {
      previous = collection.findProperty('id', prevItemName);
      if (previous) {
        previousIndex = collection.indexOf(previous);
        collection.insertAt(previousIndex + 1, item);
      } else {
        collection.pushObject(item);
      }
    } else {
      collection.unshiftObject(item);
    }
  }

});