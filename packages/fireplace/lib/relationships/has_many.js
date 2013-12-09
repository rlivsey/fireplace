// options
// embedded: (true)|false
// detached: (false)|true
// collection: custom collection type (or object|index depending...)
// query: any additional data for non-embedded fetching
// path: for detached relationships
// as: for indexed associations
// key: (type)

// TODO - allow startAt/endAt/limit options

require('fireplace/utils/expand_path');

var get        = Ember.get,
    expandPath = FP.Utils.expandPath;

FP.hasMany = function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = undefined;
  }

  options = options || {};

  if (options.embedded === undefined) {
    options.embedded = true;
  }

  var meta = {
    type:           type,
    isRelationship: true,
    kind:           'hasMany',
    options:        options
  };

  return Ember.computed(function(name, value) {
    var content, childSnap;

    if (arguments.length > 1) {
      if (value === null || value === undefined) {
        return null;
      }
      content = value;
    } else if (!options.detached) {
      var dataKey   = this.relationshipKeyFromName(name),
          snapshot  = get(this, "_snapshot");

      childSnap = snapshot && snapshot.child(dataKey);
    }

    // regardless of getting or setting, we create a new collection
    // TODO - update the old one if there is one hanging around

    // TODO - use store.findQuery for this

    var store          = get(this, "store"),
        container      = get(this, "container"),
        collectionName = options.collection || (options.embedded ? "object" : "indexed"),
        collectionType = container.lookupFactory("collection:"+collectionName),
        model          = store.modelFor(meta.type),
        query          = options.query;

    Ember.assert("Collection type must exist: "+collectionName, !!collectionType);

    if (typeof query === "function") {
      query = query.call(this);
    }

    var collectionOpts = {
      content:   content,
      store:     store,
      model:     model,
      query:     query,
      as:        options.as
    };

    if (!options.detached) {
      collectionOpts.parent    = this;
      collectionOpts.parentKey = name;
      collectionOpts.snapshot  = childSnap;
    } else {
      var reference;
      if (options.path) {
        var path = options.path;
        if (typeof path === "function") {
          path = path.call(this);
        } else {
          path = expandPath(path, this);
        }
        reference = model.buildFirebaseRootReference().child(path);
      } else {
        reference = model.buildFirebaseReference(query);
      }
      collectionOpts.firebaseReference = reference;
    }

    value = collectionType.create(collectionOpts);

    if (get(this, "isListeningToFirebase") && arguments.length === 1) {
      value.listenToFirebase();
    }

    return value;
  }).property().meta(meta);
};