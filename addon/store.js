import Ember from 'ember';

import getOwner from 'ember-getowner-polyfill';

import EventQueue   from './support/event-queue';
import PromiseModel from './model/promise-model';
import MetaModel    from './model/meta-model';

import {
  singularize
} from 'ember-inflector';

import {
  hasQueryOptions,
  extractQueryOptions
} from './utils/query';

const get         = Ember.get;
const guidFor     = Ember.guidFor;
const camelize    = Ember.String.camelize;

export default Ember.Service.extend({

  firebaseRoot: null,

  init() {
    this._super();
    this.clearCache();
    this.queue = new EventQueue();
  },

  enqueueEvent(fn, context) {
    this.queue.enqueue(fn, context);
  },

  // just returns a new instance of the same store with the same container
  // means the cache is isolated & any finds etc are operating
  // independently of the forked store.
  // no need to re-join, just save or discard your changes & firebase
  // takes care of keeping the other models in sync
  fork() {
    const factory = getOwner(this)._lookupFactory("service:store");
    return factory.create({
      firebaseRoot: get(this, "firebaseRoot")
    });
  },

  buildFirebaseRootReference(){
    const url = get(this, 'firebaseRoot');
    Ember.assert("Your store needs a firebaseRoot", !!url);
    if (url instanceof window.Firebase) {
      return url;
    }
    return new window.Firebase(url);
  },

  createRecord(type, attributes) {
    attributes = attributes || {};
    const record = this.buildRecord(type, attributes.id, attributes);
    this.storeInCache(type, record);
    return record;
  },

  saveCollection(collection) {
    const json  = collection.toFirebaseJSON();
    const ref   = collection.buildFirebaseReference();

    const limit = collection.get("limit");
    const start = collection.get("startAt");
    const end   = collection.get("endAt");

    // if the collection is built from a query as you'll nuke any data not matched
    Ember.assert("Saving a collection which is the result of a query could lose data", !limit && !start && !end);

    return new Ember.RSVP.Promise((resolve, reject) => {
      const callback = error => {
        this.enqueueEvent(() => {
          if (error) {
            reject(error);
          } else {
            collection.listenToFirebase();
            resolve(collection);
          }
        });
      };
      ref.set(json, callback);
    }, "FP: Save Collection "+ref.toString());
  },

  saveRecord(record, attr) {
    const ref      = record.buildFirebaseReference();
    const priority = get(record, 'priority');
    const json     = record.toFirebaseJSON();

    record.trigger("save");

    return new Ember.RSVP.Promise((resolve, reject) => {
      const callback = (error) => {
        this.enqueueEvent(() => {
          if (error) {
            reject(error);
          } else if (get(record, "isDeleted") || get(record, "isDeleting")) { // it was deleted in the time it took to save
            reject("the record has since been deleted");
          } else {
            if (!attr) {
              this.storeInCache(record.constructor, record);
            }
            record.listenToFirebase();
            resolve(record);
            record.trigger("saved");
          }
        });
      };

      if (attr) {
        if (attr !== 'priority') {
          const key = record.attributeKeyFromName(attr) || record.relationshipKeyFromName(attr);

          Ember.assert(Ember.inspect(record) +" has no attribute "+ attr, !!key);

          const value = json[key];
          if (value) {
            ref.child(key).set(value, callback);
          } else {
            ref.child(key).remove(callback);
          }
        } else {
          ref.setPriority(priority, callback);
        }
      } else {
        if (priority) {
          ref.setWithPriority(json, priority, callback);
        } else {
          ref.set(json, callback);
        }
      }
    }, "FP: Save "+ref.toString());
  },

  deleteRecord(record) {
    const ref         = record.buildFirebaseReference();
    const isListening = get(record, "isListeningToFirebase");

    record.trigger("delete");

    if (isListening) {
      record.stopListeningToFirebase();
    }

    return new Ember.RSVP.Promise((resolve, reject) => {
      ref.remove(error => {
        this.enqueueEvent(() => {
          if (error) {
            if (isListening) { // the delete failed, start listening to changes again
              record.listenToFirebase();
            }
            reject(error);
          } else {
            resolve(record);
            record.trigger("deleted");
          }
        });
      });
    }, "FP: Delete "+ref.toString());
  },

  find(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.findAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.findQuery(type, idOrQuery, options);
    } else {
      return this.findOne(type, idOrQuery, options);
    }
  },

  fetch(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.fetchAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.fetchQuery(type, idOrQuery, options);
    } else {
      return this.fetchOne(type, idOrQuery, options);
    }
  },

  findOne(type, id, query) {
    return this.findFetchOne(type, id, query, false);
  },

  fetchOne(type, id, query) {
    return this.findFetchOne(type, id, query, true);
  },

  findQuery(type, query, options) {
    return this.findFetchQuery(type, query, options, false);
  },

  fetchQuery(type, query, options) {
    return this.findFetchQuery(type, query, options, true);
  },

  findAll(type, query) {
    return this.findFetchQuery(type, query, {}, false);
  },

  fetchAll(type, query) {
    return this.findFetchQuery(type, query, {}, true);
  },

  findFetchQuery(type, query, options, returnPromise) {
    query   = query || {};
    options = options || {};

    // switch order if query is the options
    if (hasQueryOptions(query) || query.path || query.collection) {
      options = query;
      query   = {};
    }

    const model = this.modelFor(type);

    let reference;
    if (options.path) {
      reference = model.buildFirebaseRootReference(this).child(options.path);
    } else {
      reference = model.buildFirebaseReference(this, query);
    }

    return this.findFetchCollectionByReference(model, reference, query, options, returnPromise);
  },

  findFetchOne(type, id, query, returnPromise) {
    query = query || {};

    const placeholder = this.buildRecord(type, id, query);
    const ref         = placeholder.buildFirebaseReference();
    const existing    = this.findInCacheByReference(type, ref);

    let promise;

    if (existing) {
      existing.listenToFirebase();
      promise = Ember.RSVP.resolve(existing);
      return returnPromise ? promise : PromiseModel.create({ promise, content: existing });
    }

    promise = new Ember.RSVP.Promise((resolve, reject) => {
      ref.once('value', (snapshot) => {
        this.enqueueEvent(() => {
          const value = snapshot.val();
          if (value) {

            // for polymorhism
            const modelType = this.modelFor(type).typeFromSnapshot(snapshot);
            const record = this.createRecord(modelType, Ember.merge(query, { id, snapshot }));

            record.listenToFirebase();
            resolve(record);
          } else {
            reject('not found');
          }
        });
      }, () => {
        reject('permission denied');
      });
    }, "FP: Find one "+ref.toString());

    return returnPromise ? promise : PromiseModel.create({ promise, content: placeholder });
  },

  findFetchCollectionByReference(model, ref, query, options, returnPromise) {
    const type      = options.collection || "object";
    const factory   = getOwner(this)._lookupFactory("collection:"+type);

    const collection = factory.create(Ember.$.extend({
      store: this,
      model: model,
      query: query,
      firebaseReference: ref
    }, extractQueryOptions(options)));

    if (returnPromise) {
      return collection.fetch();
    } else {
      collection.listenToFirebase();
      return collection;
    }
  },

  modelFor(type) {
    if (typeof type !== 'string') {
      return type;
    }

    const container = getOwner(this);

    const factory = container._lookupFactory('model:' + type);
    Ember.assert("No model was found for '" + type + "'", !!factory);
    factory.typeKey = factory.typeKey || this._normalizeTypeKey(type);
    return factory;
  },

  buildRecord(type, id, attributes) {
    const factory = this.modelFor(type);
    const record = factory.create({
      store: this
    });

    if (attributes) {
      record.setProperties(attributes);
    }

    if (id) {
      record.set("id", id);
    }

    return record;
  },

  clearCache() {
    this.cache = {};
  },

  cacheForType(type) {
    const model    = this.modelFor(type);
    const guid     = guidFor(model);
    const existing = this.cache[guid];

    if (existing) {
      return existing;
    }

    const cache = {
      records: {}
    };

    this.cache[guid] = cache;

    return cache;
  },

  storeInCache(type, record) {
    // don't bother caching meta models for now
    if (record instanceof MetaModel) {
      return;
    }

    const cache = this.cacheForType(type);
    const ref   = record.buildFirebaseReference().toString();

    cache.records[ref] = record;
  },

  // when record is destroyed, remove it from the cache etc...
  teardownRecord(record) {
    const cache = this.cacheForType(record.constructor.typeKey);
    const ref   = record.buildFirebaseReference().toString();

    delete cache.records[ref];
  },

  findInCacheByReference(type, reference) {
    const cache = this.cacheForType(type);
    return cache.records[reference.toString()];
  },

  findInCacheOrCreateRecord(type, reference, attributes) {
    const record = this.findInCacheByReference(type, reference);
    if (record) {
      return record;
    } else {
      attributes.id = reference.key();
      return this.createRecord(type, attributes);
    }
  },

  all(type) {
    const cache   = this.cacheForType(type);
    const records = cache.records;
    const all     = Ember.A();

    for (let reference in records) {
      all.push(records[reference]);
    }

    return all;
  },

  _normalizeTypeKey(type) {
    return camelize(singularize(type));
  }

});