import Ember from 'ember';
import expandPath from '../utils/expand-path';

// options
// embedded: (true)|false
// detached: (false)|true
// collection: custom collection type (or object|index depending...)
// query: any additional data for non-embedded fetching
// path: for detached relationships
// as: for indexed associations
// startAt/endAt/limit for filtering
// key: (type)

const get    = Ember.get;
const isNone = Ember.isNone;

export default function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = undefined;
  }

  options = options || {};

  if (options.embedded === undefined) {
    options.embedded = true;
  }

  const meta = {
    type:           type,
    isRelationship: true,
    kind:           'hasMany',
    options:        options
  };

  return Ember.computed({
    get(key) {
      const collection = buildCollection(this, key, meta.type, false, options);
      if (get(this, "isListeningToFirebase")) {
        collection.listenToFirebase();
      }
      return collection;
    },
    set(key, value) {
      if (isNone(value)) {
        return null;
      }
      return buildCollection(this, key, meta.type, true, options, {
        content: value
      });
    }
  }).meta(meta);
}

// regardless of getting or setting, we create a new collection
// TODO - update the old one if there is one hanging around
// TODO - use store.findQuery for this
function buildCollection(model, name, type, isSetter, options, attrs) {
  const store          = get(model, "store");
  const container      = get(model, "container");
  const collectionName = options.collection || (options.embedded ? "object" : "indexed");
  const collectionType = container.lookupFactory("collection:"+collectionName);

  let query = options.query;

  Ember.assert("Collection type must exist: "+collectionName, !!collectionType);

  if (typeof query === "function") {
    query = query.call(model);
  }

  const collectionOpts = Ember.$.extend({}, attrs || {}, {
    store:     store,
    model:     type,
    query:     query,
    as:        options.as,

    // TODO - allow these to be functions?
    startAt:   options.startAt,
    endAt:     options.endAt,
    limit:     options.limit
  });

  if (!options.detached) {
    collectionOpts.parent    = model;
    collectionOpts.parentKey = name;

    if (!isSetter) {
      const dataKey   = model.relationshipKeyFromName(name);
      const snapshot  = get(model, "snapshot");

      // collections use an actual snapshot, not a MutableSnapshot
      // TODO - should be able to pass the mutable one?
      collectionOpts.snapshot = snapshot.child(dataKey).snapshot;
    }
  } else {
    const modelClass = store.modelFor(type);

    let reference;

    if (options.path) {
      let path = options.path;
      if (typeof path === "function") {
        path = path.call(model);
      } else {
        path = expandPath(path, model);
      }
      reference = modelClass.buildFirebaseRootReference(store).child(path);
    } else {
      reference = modelClass.buildFirebaseReference(store, query);
    }

    collectionOpts.firebaseReference = reference;
  }

  return collectionType.create(collectionOpts);
}