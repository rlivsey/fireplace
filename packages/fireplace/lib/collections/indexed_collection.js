require('fireplace/collections/collection');
require('fireplace/model/meta_model');

var get = Ember.get,
    set = Ember.set;

FP.IndexedCollection = FP.Collection.extend({

  firebaseEvents: "child_changed",

  as: null, // the meta model wrapper to use

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

  // If we start listening straight after initializing then this is redundant
  // as all the data gets sent in onFirebaseChildAdded anyway
  // but we don't know if we're going to be live or not in the near future
  // so inflate if we have a snapshot
  inflateFromSnapshot: Ember.on("init", function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot) { return; }

    var content = [], _this = this;
    snapshot.forEach(function(child) {
      content.push(_this.itemFromSnapshot(child));
    });
    set(this, "content", content);
  }),

  // transform content to underlying representation on assignment
  // Note that these won't have any priorities unless they are meta models
  content: function(k, value) {
    if (arguments.length === 1) {
      return;
    }

    if (!value) {
      return value;
    }

    return value.map(function(item){
      if (item instanceof Ember.Object) {
        return this.itemFromRecord(item);
      } else {
        return item;
      }
    }, this);
  }.property(),

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
      priority: snapshot.getPriority(),
      snapshot: snapshot,
      record:   null
    };
  },

  itemFromRecord: function(record) {
    record = this.wrapRecordInMetaObjectIfNeccessary(record);

    var priority = null;
    if (priority instanceof FP.MetaModel) {
      priority = get(record, "priority");
    }

    return {
      id:       get(record, 'id'),
      snapshot: null,
      priority: priority,
      record:   record
    };
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(function(object) {
      if (object instanceof FP.MetaModel) {
        object.set("parent", this);
        return this.itemFromRecord(object);
      } else if (object instanceof Ember.Object) {
        return this.itemFromRecord(object);
      } else {
        return object;
      }
    }, this);
    return this._super(start, numRemoved, objectsAdded);
  },

  // TODO - can we replace this with objectAtContentAsPromise and always use fetch somehow?
  objectAtContent: function(idx) {
    var content = get(this, "arrangedContent");
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
    var content = get(this, "arrangedContent");
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
        return _this.wrapRecordInMetaObjectIfNeccessary(resolved, item.snapshot);
      });
    } else {
      record = store.findOne(type, item.id, query);
      return this.wrapRecordInMetaObjectIfNeccessary(record, item.snapshot);
    }
  },

  wrapRecordInMetaObjectIfNeccessary: function(record, snapshot) {
    var as = get(this, "as");
    if (!as || record instanceof FP.MetaModel) {
      return record;
    }

    var store    = get(this, "store"),
        priority = snapshot ? snapshot.getPriority() : null;

    var meta = store.buildRecord(as, null, {
      content:  record,
      priority: priority,
      snapshot: snapshot,
      parent:   this
    });

    if (snapshot) {
      meta.listenToFirebase();
    }
    return meta;
  },

  onFirebaseChildAdded: function(snapshot, prevItemName) {
    var id      = snapshot.name(),
        content = get(this, "content");

    if (content.findBy('id', id)) { return; }

    var item = this.itemFromSnapshot(snapshot);

    // arrangedContent maintains order
    content.pushObject(item);
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

    var priority = snapshot.getPriority();
    set(item, "priority", priority);

    // only set priority on the meta-model, otherwise we'd nuke the priority
    // on the underlying record which exists elsewhere in the tree and could have
    // its own priority
    if (get(this, "as") && item.record) {
      set(item.record, 'priority', priority);
    }
  },

  // if the child changed then its meta information has changed
  // if we're polymorphic this means we'll need to fetch a new content item
  // otherwise the meta model will take care of it
  // currently this replaces the item each time, but we should only need to do this
  // when polymorphic and the polymorph key has changed - but we don't currently
  // know what that is
  // TODO - add polymorphic: true/key as an option where key defaults to 'type'
  onFirebaseChildChanged: function(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    // item.snapshot = snapshot;

    // TODO - only do this if polymorphic and the polymorph key has changed
    // otherwise just update the snapshot
    var index   = content.indexOf(item),
        newItem = this.itemFromSnapshot(snapshot);

    content.replace(index, 1, [newItem]);
  }

});