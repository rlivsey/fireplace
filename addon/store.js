/* global Firebase */

import Ember from 'ember';

import EventQueue   from './support/event-queue';
import PromiseModel from './model/promise-model';
import MetaModel    from './model/meta-model';

import { singularize } from 'ember-inflector';

var get     = Ember.get;
var guidFor = Ember.guidFor;

var camelize = Ember.String.camelize;

export default Ember.Object.extend({

  firebaseRoot: null,

  init: function() {
    this._super();
    this.clearCache();
    this.queue = new EventQueue();
  },

  enqueueEvent: function(fn, context) {
    this.queue.enqueue(fn, context);
  },

  // just returns a new instance of the same store with the same container
  // means the cache is isolated & any finds etc are operating
  // independently of the forked store.
  // no need to re-join, just save or discard your changes & firebase
  // takes care of keeping the other models in sync
  fork: function() {
    return this.constructor.create({
      container: get(this, "container")
    });
  },

  buildFirebaseRootReference: function(){
    var url = get(this, 'firebaseRoot');
    Ember.assert("Your store needs a firebaseRoot", !!url);
    if (url instanceof Firebase) {
      return url;
    }
    return new Firebase(url);
  },

  createRecord: function(type, attributes) {
    attributes = attributes || {};
    var record = this.buildRecord(type, attributes.id, attributes);
    this.storeInCache(type, record);
    return record;
  },

  saveCollection: function(collection) {
    var json  = collection.toFirebaseJSON();
    var ref   = collection.buildFirebaseReference();
    var _this = this;

    var limit = collection.get("limit");
    var start = collection.get("startAt");
    var end   = collection.get("endAt");

    // if the collection is built from a query as you'll nuke any data not matched
    Ember.assert("Saving a collection which is the result of a query could lose data", !limit && !start && !end);

    return new Ember.RSVP.Promise(function(resolve, reject){
      var callback = function(error) {
        _this.enqueueEvent(function(){
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

  saveRecord: function(record, attr) {
    var ref      = record.buildFirebaseReference();
    var priority = get(record, 'priority');
    var json     = record.toFirebaseJSON();
    var _this    = this;

    record.trigger("save");

    return new Ember.RSVP.Promise(function(resolve, reject){
      var callback = function(error) {
        _this.enqueueEvent(function(){
          if (error) {
            reject(error);
          } else if (get(record, "isDeleted") || get(record, "isDeleting")) { // it was deleted in the time it took to save
            reject("the record has since been deleted");
          } else {
            if (!attr) {
              _this.storeInCache(record.constructor, record);
            }
            record.listenToFirebase();
            resolve(record);
            record.trigger("saved");
          }
        });
      };

      if (attr) {
        if (attr !== 'priority') {
          var key = record.attributeKeyFromName(attr) || record.relationshipKeyFromName(attr);

          Ember.assert(Ember.inspect(record) +" has no attribute "+ attr, !!key);

          var value = json[key];
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

  deleteRecord: function(record) {
    var ref         = record.buildFirebaseReference(),
        _this       = this,
        isListening = get(record, "isListeningToFirebase");

    record.trigger("delete");

    if (isListening) {
      record.stopListeningToFirebase();
    }

    return new Ember.RSVP.Promise(function(resolve, reject){
      ref.remove(function(error) {
        _this.enqueueEvent(function(){
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

  find: function(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.findAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.findQuery(type, idOrQuery, options);
    } else {
      return this.findOne(type, idOrQuery, options);
    }
  },

  fetch: function(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.fetchAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.fetchQuery(type, idOrQuery, options);
    } else {
      return this.fetchOne(type, idOrQuery, options);
    }
  },

  findOne: function(type, id, query) {
    return this.findFetchOne(type, id, query, false);
  },

  fetchOne: function(type, id, query) {
    return this.findFetchOne(type, id, query, true);
  },

  findQuery: function(type, query, options) {
    return this.findFetchQuery(type, query, options, false);
  },

  fetchQuery: function(type, query, options) {
    return this.findFetchQuery(type, query, options, true);
  },

  findAll: function(type, query) {
    return this.findFetchQuery(type, query, {}, false);
  },

  fetchAll: function(type, query) {
    return this.findFetchQuery(type, query, {}, true);
  },

  findFetchQuery: function(type, query, options, returnPromise) {
    options = options || {};
    query   = query   || {};

    // switch order if query is the options
    if (query.startAt || query.endAt || query.limit || query.path || query.collection) {
      options = query;
      query   = {};
    }

    var model = this.modelFor(type),
        reference;

    if (options.path) {
      reference = model.buildFirebaseRootReference(this).child(options.path);
    } else {
      reference = model.buildFirebaseReference(this, query);
    }

    return this.findFetchCollectionByReference(model, reference, query, options, returnPromise);
  },

  findFetchOne: function(type, id, query, returnPromise) {
    query = query || {};

    var record   = this.buildRecord(type, id, query),
        ref      = record.buildFirebaseReference(),
        existing = this.findInCacheByReference(type, ref),
        promise;

    if (existing) {
      existing.listenToFirebase();
      promise = Ember.RSVP.resolve(existing);
      return returnPromise ? promise : PromiseModel.create({content: existing, promise: promise});
    }

    var _this = this;

    promise = new Ember.RSVP.Promise(function(resolve, reject){
      ref.once('value', function(snapshot){
        _this.enqueueEvent(function(){
          var value = snapshot.val();
          if (value) {

            // for polymorhism
            var modelType = _this.modelFor(type).typeFromSnapshot(snapshot);
            record = _this.createRecord(modelType, Ember.merge(query, {
              id: id,
              snapshot: snapshot
            }));

            record.listenToFirebase();
            resolve(record);
          } else {
            reject('not found');
          }
        });
      }, function(){
        reject('permission denied');
      });
    }, "FP: Find one "+ref.toString());

    return returnPromise ? promise : PromiseModel.create({promise: promise, content: record});
  },

  findFetchCollectionByReference: function(model, ref, query, options, returnPromise) {
    var container = get(this, 'container');
    var type      = options.collection || "object";
    var factory   = container.lookupFactory("collection:"+type);

    var collection = factory.create({
      store: this,
      model: model,
      query: query,
      firebaseReference: ref,
      startAt: options.startAt,
      endAt: options.endAt,
      limit: options.limit
    });

    if (returnPromise) {
      return collection.fetch();
    } else {
      collection.listenToFirebase();
      return collection;
    }
  },

  modelFor: function(type) {
    var factory;

    if (typeof type === 'string') {
      factory = get(this, 'container').lookupFactory('model:' + type);
      Ember.assert("No model was found for '" + type + "'", !!factory);
      factory.typeKey = factory.typeKey || this._normalizeTypeKey(type);
    } else {
      factory = type;
      if (factory.typeKey) {
        factory.typeKey = this._normalizeTypeKey(factory.typeKey);
      }
    }
    return factory;
  },

  buildRecord: function(type, id, attributes) {
    var container = get(this, "container"),
        factory   = this.modelFor(type),
        record;

    record = factory.create({
      store:     this,
      container: container
    });

    if (attributes) {
      record.setProperties(attributes);
    }

    if (id) {
      record.set("id", id);
    }

    return record;
  },

  clearCache: function() {
    this.cache = {};
  },

  cacheForType: function(type) {
    var model = this.modelFor(type),
        guid  = guidFor(model),
        cache = this.cache[guid];

    if (cache) {
      return cache;
    }

    cache = {
      records:  {}
    };

    this.cache[guid] = cache;

    return cache;
  },

  storeInCache: function(type, record) {
    // don't bother caching meta models for now
    if (record instanceof MetaModel) {
      return;
    }

    var cache = this.cacheForType(type),
        ref   = record.buildFirebaseReference().toString();

    cache.records[ref] = record;
  },

  // when record is destroyed, remove it from the cache etc...
  teardownRecord: function(record) {
    var cache = this.cacheForType(record.constructor),
        ref   = record.buildFirebaseReference().toString();

    delete cache.records[ref];
  },

  findInCacheByReference: function(type, reference) {
    var cache = this.cacheForType(type);
    return cache.records[reference.toString()];
  },

  findInCacheOrCreateRecord: function(type, reference, attributes) {
    var record = this.findInCacheByReference(type, reference);
    if (record) {
      return record;
    } else {
      attributes.id = reference.name();
      return this.createRecord(type, attributes);
    }
  },

  all: function(type) {
    var cache   = this.cacheForType(type),
        records = cache.records,
        all     = [],
        reference;

    for (reference in records) {
      all.push(records[reference]);
    }

    return all;
  },

  _normalizeTypeKey: function(type) {
    return camelize(singularize(type));
  }

});