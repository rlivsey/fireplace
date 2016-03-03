import Ember from 'ember';
import Firebase from 'firebase';

import expandPath from '../utils/expand-path';
import {
  ModelMixin,
  ModelClassMixin
} from './model-mixin';

const get        = Ember.get;
const underscore = Ember.String.underscore;
const pluralize  = Ember.String.pluralize;

const Model = Ember.Object.extend(ModelMixin, {
  id: Ember.computed({
    get() {
      const store = get(this, 'store');
      return this.constructor.buildFirebaseRootReference(store).push().key();
    },
    set(key, value) {
      return value;
    }
  }),

  debugReference: Ember.computed(function(){
    return this.buildFirebaseReference().toString();
  }),

  buildFirebaseReference(){
    const id        = get(this, 'id');
    const parent    = get(this, 'parent');
    const parentKey = get(this, 'parentKey');

    if (parent && parentKey) {
      const childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    let ref;

    if (parent) {
      ref = parent.buildFirebaseReference();
    } else {
      const store = get(this, 'store');
      ref = this.constructor.buildFirebaseReference(store, this);
    }

    return ref.child(id);
  }
});

export default Model;

Model.reopenClass(ModelClassMixin, {
  firebasePath(/* opts */) {
    // typeKey is set in the store when looking up the factory
    Ember.assert("No typeKey set, you must use the store to create/find records", !!this.typeKey);
    return pluralize(underscore(this.typeKey));
  },

  // override for polymophism
  typeFromSnapshot(/* snapshot */) {
    return this;
  },

  // defaults to the store's root reference, normally won't be overridden
  // unless you have a different firebase per model, which could cause oddness!
  buildFirebaseRootReference(store) {
    return store.buildFirebaseRootReference();
  },

  // override if you want to do something different based on the options
  // can be handy for polymorphism
  firebasePathOptions(opts) {
    return opts;
  },

  buildFirebaseReference(store, opts) {
    opts = this.firebasePathOptions(opts || {});

    let path = this.firebasePath;
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

    const root = this.buildFirebaseRootReference(store);
    return root.child(path);
  }
});