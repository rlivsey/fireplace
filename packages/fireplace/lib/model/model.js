require('fireplace/model/model_mixin');
require('fireplace/utils/expand_path');

var get        = Ember.get,
    expandPath = FP.Utils.expandPath;

FP.Model = Ember.Object.extend(FP.ModelMixin, {
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

FP.Model.reopenClass(FP.ModelClassMixin, {
  firebasePath: function(){
    Ember.assert('ember-inflector not found, install or manually set firebasePath references', Ember.String.pluralize);
    var className = this.toString().split('.').pop();
    return Ember.String.pluralize(Ember.String.underscore(className));
  },

  // defaults to the store's root reference, normally won't be overridden
  // unless you have a different firebase per model, which could cause oddness!
  buildFirebaseRootReference: function(store) {
    return store.buildFirebaseRootReference();
  },

  buildFirebaseReference: function(store, opts){
    opts = opts || {};

    var path = this.firebasePath;
    if (typeof path === "function") {
      // so firebase path  can do opts.get("...") regardless of being passed hash or model instance
      if (!(opts instanceof Ember.Object)) {
        opts = Ember.Object.create(opts);
      }
      path = path.call(this, opts);
    } else if (typeof path === "string") {
      path = expandPath(path, opts);
    }

    if (path instanceof Firebase) {
      return path;
    }

    var root = this.buildFirebaseRootReference(store);
    return root.child(path);
  }
});