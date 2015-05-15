import Ember from 'ember';
import expandPath from '../utils/expand-path';
import { extractQueryOptions } from '../utils/query';

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
      const dataKey    = this.relationshipKeyFromName(key);
      const snapshot   = get(this, "snapshot").child(dataKey).snapshot;
      const collection = buildCollection(this, key, meta.type, options, { snapshot });

      if (get(this, "isListeningToFirebase")) {
        collection.listenToFirebase();
      }
      return collection;
    },
    set(key, content) {
      if (isNone(content)) {
        return null;
      }

      return buildCollection(this, key, meta.type, options, { content });
    }
  }).meta(meta);
}

function buildCollection(model, name, type, options, attrs) {
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
    as:        options.as
  }, extractQueryOptions(options));

  if (options.detached) {
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
  } else {
    collectionOpts.parent    = model;
    collectionOpts.parentKey = name;
  }

  return collectionType.create(collectionOpts);
}