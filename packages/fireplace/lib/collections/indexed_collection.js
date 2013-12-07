require('fireplace/collections/collection');
require('fireplace/model/meta_model');

var get = Ember.get,
    set = Ember.set;

FP.IndexedCollection = FP.Collection.extend({

  firebaseEvents: "child_changed",

  as: null,    // the meta model wrapper to use
  query: null, // any query params to use when finding the item

  toFirebaseJSON: function() {
    var value;
    return this.reduce(function(json, item) {
      if (item instanceof FP.MetaModel) {
        value = item.toFirebaseJSON(true);
      } else {
        value = true;
      }
      json[get(item, 'id')] = value;
      return json;
    }, {});
  },

  contentChanged: function() {
    if (this._updatingContent) { return; }

    var content = get(this, "content");
    if (!content) { return; }

    var anyTransformed = false;
    var transformed = content.map(function(item){
      if (item instanceof Ember.Object) {
        item = this.itemFromRecord(item);
        anyTransformed = true;
      }
      return item;
    }, this);

    if (anyTransformed) {
      this._updatingContent = true;
      set(this, "content", transformed);
      this._updatingContent = false;
    }
  }.observes("content").on("init"),

  // if we're listening, then our meta model items should be too
  listenToFirebase: function() {
    if (get(this, "as")) {
      this.invoke("listenToFirebase");
    }
    return this._super();
  },

  stopListeningToFirebase: function() {
    if (get(this, "as")) {
      this.invoke("stopListeningToFirebase");
    }
    return this._super();
  },

  hasLoadedAllChildren: function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot || snapshot.numChildren() !== get(this, "length")) { return false; }

    // we go through content instead of this.forEach as that would issue finds for all unloaded items
    var content = get(this, "content");

    // we've loaded all children if every item has a record object
    return content.every(function(item) { return !!item.record; });
  }.property("length", "snapshot"),

  // WIP - experimental & untested
  fetch: function() {
    if (get(this, "hasLoadedAllChildren")) {
      return Ember.RSVP.resolve(this);
    }

    var _this = this;
    return this.listenToFirebase().then(function() {
      var content  = get(_this, "content");
      var promises = content.map(function(item, index){
        return _this.objectAtContentAsPromise(index);
      });
      return Ember.RSVP.all(promises);
    }).then(function() {
      return _this;
    });
  },

  itemFromSnapshot: function(snapshot) {
    return {
      id:       snapshot.name(),
      snapshot: snapshot,
      record:   null
    };
  },

  itemFromRecord: function(record) {
    return {
      id:       get(record, 'id'),
      snapshot: null,
      record:   record
    };
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(function(object) {
      return (object instanceof Ember.Object) ? this.itemFromRecord(object) : object;
    }, this);
    return this._super(start, numRemoved, objectsAdded);
  },

  // TODO - can we replace this with objectAtContentAsPromise and always use fetch somehow?
  objectAtContent: function(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return;
    }

    var item = content.objectAt(idx);
    if (!item) {
      return;
    }

    // already inflated
    if (item.record) {
      return item.record;
    }

    item.record = this.findFetchRecordFromItem(item, false);

    return item.record;
  },

  objectAtContentAsPromise: function(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return Ember.RSVP.reject();
    }

    var item = content.objectAt(idx);
    if (!item) {
      return Ember.RSVP.reject();
    }

    // already inflated
    if (item.record) {
      return Ember.RSVP.resolve(item.record);
    }

    var recordPromise = this.findFetchRecordFromItem(item, true);
    return recordPromise.then(function(record) {
      item.record = record;
      return item.record;
    });
  },

  // TODO - handle findOne failing (permissions / 404)
  findFetchRecordFromItem: function(item, returnPromise) {
    var store  = get(this, "store"),
        query  = get(this, "query"),
        type   = this.modelClassFromSnapshot(item.snapshot),
        _this  = this,
        record;

    if (returnPromise) {
      record = store.fetchOne(type, item.id, query);
      return record.then(function(resolved) {
        return _this.wrapRecordInMetaObjectIfNeccessary(resolved, item);
      });
    } else {
      record = store.findOne(type, item.id, query);
      return this.wrapRecordInMetaObjectIfNeccessary(record, item);
    }
  },

  wrapRecordInMetaObjectIfNeccessary: function(record, item) {
    var as = get(this, "as");
    if (!as) {
      return record;
    }

    var store = get(this, "store");

    var meta = store.buildRecord(as, null, {
      content:  record,
      priority: item.snapshot.getPriority(),
      snapshot: item.snapshot,
      parent:   this
    });

    // TODO - should we be listening now?
    meta.listenToFirebase();
    return meta;
  },

  onFirebaseChildAdded: function(snapshot, prevItemName) {
    var id      = snapshot.name(),
        content = get(this, "content");

    if (content.findBy('id', id)) { return; }

    var item = this.itemFromSnapshot(snapshot);
    this.insertAfter(prevItemName, item, content);
  },

  onFirebaseChildRemoved: function(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    content.removeObject(item);
  },

  onFirebaseChildMoved: function(snapshot, prevItemName) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    content.removeObject(item);

    // only set priority on the meta-model, otherwise we'd nuke the priority
    // on the underlying record which exists elsewhere in the tree and could have
    // its own priority
    if (get(this, "as") && item.record) {
      set(item.record, 'priority', snapshot.getPriority());
    }

    this.insertAfter(prevItemName, item, content);
  },

  // keep the snapshot up to date in-case we haven't materialized the record yet
  // otherwise when we do contentAt(xxx) we'd get the old version of the record initially
  // until it starts listening and then updates itself
  onFirebaseChildChanged: function(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }
    item.snapshot = snapshot;
  }

});