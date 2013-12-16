require('fireplace/model/promise_model');

var get     = Ember.get,
    set     = Ember.set,
    guidFor = Ember.guidFor;

FP.Store = Ember.Object.extend({

  firebaseRoot: null,

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
    Ember.assert("Your store needs a firebaseRoot", url);
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

  saveRecord: function(record, attr) {
    var ref      = record.buildFirebaseReference();
    var priority = get(record, 'priority');
    var json     = record.toFirebaseJSON();
    var _this    = this;

    return Ember.RSVP.Promise(function(resolve, reject){
      var callback = function(error) {
        Ember.run(function(){
          if (error) {
            reject(error);
          } else {
            if (!attr) {
              _this.storeInCache(record.constructor, record);
            }
            record.listenToFirebase();
            resolve(record);
          }
        });
      };

      if (attr) {
        if (attr !== 'priority') {
          var key = record.attributeKeyFromName(attr) || record.relationshipKeyFromName(attr);

          Ember.assert(Ember.inspect(record) +" has no attribute "+ attr, key);

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
    });
  },

  deleteRecord: function(record) {
    var ref = record.buildFirebaseReference();
    return Ember.RSVP.Promise(function(resolve, reject){
      ref.remove(function(error) {
        Ember.run(function(){
          if (error) {
            reject(error);
          } else {
            record.stopListeningToFirebase();
            resolve(record);
          }
        });
      });
    });
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
        existing = this.findInCacheByReference(type, ref);

    if (existing) {
      existing.listenToFirebase();
      return returnPromise ? Ember.RSVP.resolve(existing) : existing;
    }

    var _this = this;

    var promise = Ember.RSVP.Promise(function(resolve, reject){
      ref.once('value', function(snapshot){
        Ember.run(function(){
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
    });

    return returnPromise ? promise : FP.PromiseModel.create({promise: promise, content: record});
  },

  findFetchCollectionByReference: function(model, ref, query, options, returnPromise) {
    var container = get(this, 'container');

    // TODO - allow specifying a custom collection type
    var type    = options.collection || "object",
        factory = container.lookupFactory("collection:"+type),
        collection, promise, fbQuery;

    collection = factory.create({
      store: this,
      model: model,
      query: query,
      firebaseReference: ref,
      startAt: options.startAt,
      endAt: options.endAt,
      limit: options.limit
    });

    fbQuery = collection.buildFirebaseQuery();

    promise = Ember.RSVP.Promise(function(resolve, reject){
      fbQuery.once('value', function(snapshot){
        Ember.run(function(){
          // we don't reject if snapshot is empty, an empty collection is still valid
          set(collection, "snapshot", snapshot);
          collection.inflateFromSnapshot();
          collection.listenToFirebase();
          resolve(collection);
        });
      }, function(){
        reject('permission denied');
      });
    });

    return returnPromise ? promise : collection;
  },

  modelFor: function(type) {
    var factory;

    if (typeof type === 'string') {
      factory = get(this, 'container').lookupFactory('model:' + type);
      Ember.assert("No model was found for '" + type + "'", factory);
    } else {
      factory = type;
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

  clearCache: Ember.on('init', function() {
    this.cache = {};
  }),

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
    if (record instanceof FP.MetaModel) {
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
  }

});