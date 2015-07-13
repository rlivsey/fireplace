import Ember from 'ember';

import LiveMixin from '../model/live-mixin';

const get           = Ember.get;
const set           = Ember.set;
const getProperties = Ember.getProperties;

export const QUERY_OPTIONS = [
  'equalTo',
  'limit',
  'limitToFirst',
  'limitToLast',
  'orderByChild',
  'orderByKey',
  'orderByPriority',
  'orderByValue',
  'startAt',
  'endAt'
];

export default Ember.ArrayProxy.extend(LiveMixin, {
  firebaseEvents: ['child_added', 'child_removed', 'child_moved'],

  model:     null,
  parent:    null,
  parentKey: null,
  snapshot:  null,
  query:     null,

  // filtering
  equalTo:         null, // value, or {value, key}
  limit:           null, // limit
  limitToFirst:    null, // limit
  limitToLast:     null, // limit
  orderByChild:    null, // key
  orderByKey:      null, // true
  orderByPriority: null, // true
  orderByValue:    null, // true
  startAt:         null, // value, or {value, key}
  endAt:           null, // value, or {value, key}

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
    const options = getProperties(this, QUERY_OPTIONS);

    Ember.assert("you can only order by one thing at a time", [options.orderByChild, options.orderByKey, options.orderByPriority, options.orderByValue].filter(o => o).length <= 1);

    // Ordering has to come first

    if (options.orderByChild) {
      reference = reference.orderByChild(options.orderByChild);
    }

    if (options.orderByKey) {
      reference = reference.orderByKey();
    }

    if (options.orderByValue) {
      reference = reference.orderByValue();
    }

    if (options.orderByPriority) {
      reference = reference.orderByPriority();
    }

    // Now we've ordered, we can filter

    if (options.startAt) {
      if (Ember.typeOf(options.startAt) === 'object') {
        reference = reference.startAt(options.startAt.value, options.startAt.key);
      } else {
        reference = reference.startAt(options.startAt);
      }
    }

    if (options.endAt) {
      if (Ember.typeOf(options.endAt) === 'object') {
        reference = reference.endAt(options.endAt.value, options.endAt.key);
      } else {
        reference = reference.endAt(options.endAt);
      }
    }

    if (options.equalTo) {
      if (Ember.typeOf(options.equalTo) === 'object') {
        reference = reference.equalTo(options.equalTo.value, options.equalTo.key);
      } else {
        reference = reference.equalTo(options.equalTo);
      }
    }

    if (options.limit) {
      Ember.deprecate("limit is deprecated, use limitToFirst or limitToEnd instead");
      reference = reference.limit(options.limit);
    }

    if (options.limitToFirst) {
      reference = reference.limitToFirst(options.limitToFirst);
    }

    if (options.limitToLast) {
      reference = reference.limitToLast(options.limitToLast);
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
      previous = collection.findBy('id', prevItemName);
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