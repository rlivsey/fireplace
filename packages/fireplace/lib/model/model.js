require('fireplace/model/model_mixin');

var get = Ember.get;

FP.Model = Ember.Object.extend(FP.ModelMixin, {
  id: function(key, value) {
    if (value) { return value; }
    return this.constructor.buildFirebaseRootReference().push().name();
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
      ref = this.constructor.buildFirebaseReference(this);
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
  buildFirebaseRootReference: function() {
    // set by Store#modelFor
    var store = this.store;
    Ember.assert("Model "+this.constructor.toString()+" doesn't have a store, ensure it was created via Store#createRecord etc...", store);
    return store.buildFirebaseRootReference();
  },

  buildFirebaseReference: function(opts){

    var path = this.firebasePath;
    if (typeof path === "function") {
      opts = opts || {};
      // so firebase path can do opts.get("...") regardless of being passed hash or model instance
      if (!(opts instanceof Ember.Object)) {
        opts = Ember.Object.create(opts);
      }
      path = path.call(this, opts);
    }

    if (path instanceof Firebase) {
      return path;
    }

    var root = this.buildFirebaseRootReference();
    return root.child(path);
  }
});