import Ember from 'ember';
import Collection from './base';
import MetaModel from '../model/meta-model';
import PromiseProxy from './promise';

var get = Ember.get;
var set = Ember.set;

export default Collection.extend({

  firebaseEvents: "child_changed",

  as: null, // the meta model wrapper to use

  toFirebaseJSON: function() {
    var value;
    return this.reduce(function(json, item) {
      if (item instanceof MetaModel) {
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

  fetch: function() {
    var promise = this.listenToFirebase().
      then(this._fetchAll.bind(this)).
      then(Ember.K.bind(this));

    return PromiseProxy.create({promise: promise});
  },

  _fetchAll: function() {
    return Ember.RSVP.all(get(this, "content").map(function(item, index) {
      return this.objectAtContentAsPromise(index);
    }.bind(this)));
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
      record:   this.wrapRecordInMetaObjectIfNeccessary(record)
    };
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(function(object) {
      if (object instanceof MetaModel) {
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

    item.record.get("promise").then(function(obj) {
      if (item.record instanceof MetaModel) {
        item.record.set("content", obj);
      } else {
        item.record = obj;
      }
    });

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
      // is the item.record a promise proxy, if so return that
      // so we end up with the actual object
      var promise = item.record.get("promise");
      if (promise) {
        return promise;
      }
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
    if (!as || record instanceof MetaModel) {
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