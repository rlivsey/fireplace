/* global Firebase */

import Ember from 'ember';
import { pluralize } from 'ember-inflector';

import expandPath from '../utils/expand-path';
import {
  ModelMixin,
  ModelClassMixin
} from './model-mixin';

var get        = Ember.get;
var underscore = Ember.String.underscore;

var Model = Ember.Object.extend(ModelMixin, {
  id: function(key, value) {
    if (value) { return value; }

    var store = get(this, 'store');
    return this.constructor.buildFirebaseRootReference(store).push().name();
  }.property(),

  debugReference: function(){
    return this.buildFirebaseReference().toString();
  }.property(),

  buildFirebaseReference: function(){
    var id        = get(this, 'id'),
        parent    = get(this, 'parent'),
        parentKey = get(this, 'parentKey'),
        ref;

    if (parent && parentKey) {
      var childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    if (parent) {
      ref = parent.buildFirebaseReference();
    } else {
      var store = get(this, 'store');
      ref = this.constructor.buildFirebaseReference(store, this);
    }

    return ref.child(id);
  }
});

export default Model;

Model.reopenClass(ModelClassMixin, {
  firebasePath: function(/* opts */) {
    // typeKey is set in the store when looking up the factory
    Ember.assert("No typeKey set, you must use the store to create/find records", !!this.typeKey);
    return pluralize(underscore(this.typeKey));
  },

  // override for polymophism
  typeFromSnapshot: function(/* snapshot */) {
    return this;
  },

  // defaults to the store's root reference, normally won't be overridden
  // unless you have a different firebase per model, which could cause oddness!
  buildFirebaseRootReference: function(store) {
    return store.buildFirebaseRootReference();
  },

  // override if you want to do something different based on the options
  // can be handy for polymorphism
  firebasePathOptions: function(opts) {
    return opts;
  },

  buildFirebaseReference: function(store, opts) {
    opts = this.firebasePathOptions(opts || {});

    var path = this.firebasePath;
    if (typeof path === "function") {
      // so firebase path can do opts.get("...") regardless of being passed hash or model instance
      if (!(opts instanceof Ember.Object)) {
        opts = Ember.Object.create(opts);
      }
      path = path.call(this, opts);
    }

    if (typeof path === "string") {
      path = expandPath(path, opts);
    }

    if (path instanceof Firebase) {
      return path;
    }

    var root = this.buildFirebaseRootReference(store);
    return root.child(path);
  }
});