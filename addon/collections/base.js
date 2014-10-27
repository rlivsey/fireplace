import Ember from 'ember';

import LiveMixin from '../model/live-mixin';

var get           = Ember.get;
var set           = Ember.set;
var getProperties = Ember.getProperties;

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

  onFirebaseChildAdded:   Ember.required,
  onFirebaseChildRemoved: Ember.required,
  onFirebaseChildMoved:   Ember.required,
  toFirebaseJSON:         Ember.required,

  isNew: Ember.computed(function(){
    return !get(this, "snapshot");
  }).property("snapshot"),

  firebaseReference: null,

  debugReference: function(){
    return this.buildFirebaseReference().toString();
  }.property(),

  buildFirebaseReference: function() {
    // do we have an explicit reference?
    var ref = get(this, 'firebaseReference');
    if (ref) {
      return ref;
    }

    // do we have an explicit path to build from?
    var path  = get(this, 'firebasePath'),
        store = get(this, 'store');

    if (path) {
      var rootRef = store.buildFirebaseRootReference();
      return rootRef.child(path);
    }

    // are we an embedded collection in a relationship?
    var parent    = get(this, 'parent'),
        parentKey = get(this, 'parentKey');

    if (parent && parentKey) {
      var childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    // otherwise we're a root collection, use the model reference
    var modelName  = get(this, 'model'),
        modelClass = store.modelFor(modelName);

    return modelClass.buildFirebaseReference(store);
  },

  buildFirebaseQuery: function() {
    var reference = this.buildFirebaseReference(),
        options = getProperties(this, 'startAt', 'endAt', 'limit');

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

  save: function() {
    return this.store.saveCollection(this);
  },

  modelClassFromSnapshot: function(snap) {
    var modelName = get(this, 'model');
    var baseClass = this.store.modelFor(modelName);
    return baseClass.typeFromSnapshot(snap);
  },

  onFirebaseValue: function(snapshot) {
    set(this, "snapshot", snapshot);
  },

  setupContent: Ember.on('init', function() {
    if (!get(this, 'content')) {
      set(this, 'content', []);
    }
  }),

  insertAfter: function(prevItemName, item, collection) {
    collection = collection || this;

    var previous, previousIndex;
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