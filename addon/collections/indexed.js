import Ember from 'ember';
import Collection from './base';
import MetaModel from '../model/meta-model';
import PromiseProxy from './promise';

const get = Ember.get;
const set = Ember.set;

export default Collection.extend({

  firebaseEvents: "child_changed",

  as: null, // the meta model wrapper to use

  toFirebaseJSON() {
    return this.reduce((json, item) => {
      let value;
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
    const snapshot = get(this, "snapshot");
    if (!snapshot) { return; }

    const content = [];

    // snapshot doesn't implement map
    snapshot.forEach(child => {
      content.push(this.itemFromSnapshot(child)); // avoid implicit return as Snapshot#forEach cancels if you return true
    });

    set(this, "content", Ember.A(content));
  }),

  contentChanged: Ember.on("init", Ember.observer("content", function() {
    if (this._updatingContent) { return; }

    const content = get(this, "content");
    if (!content) { return; }

    let anyTransformed = false;
    const transformed = content.map(item => {
      if (item instanceof Ember.Object) {
        item = this.itemFromRecord(item);
        anyTransformed = true;
      }
      return item;
    });

    if (anyTransformed) {
      this._updatingContent = true;
      set(this, "content", Ember.A(transformed));
      this._updatingContent = false;
    }
  })),

  // if we're listening, then our meta model items should be too
  listenToFirebase() {
    if (get(this, "as")) {
      this.invoke("listenToFirebase");
    }
    return this._super();
  },

  stopListeningToFirebase() {
    if (get(this, "as")) {
      this.invoke("stopListeningToFirebase");
    }
    return this._super();
  },

  fetch() {
    const promise = this.listenToFirebase().
      then(this._fetchAll.bind(this)).
      then(function() {}.bind(this));

    return PromiseProxy.create({promise: promise});
  },

  _fetchAll() {
    return Ember.RSVP.all(get(this, "content").map((_, index) => this.objectAtContentAsPromise(index) ));
  },

  itemFromSnapshot(snapshot) {
    return {
      id:       snapshot.key(),
      snapshot: snapshot,
      record:   null
    };
  },

  itemFromRecord(record) {
    return {
      id:       get(record, 'id'),
      snapshot: null,
      record:   this.wrapRecordInMetaObjectIfNeccessary(record)
    };
  },

  replaceContent(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(object => {
      if (object instanceof MetaModel) {
        object.set("parent", this);
        return this.itemFromRecord(object);
      } else if (object instanceof Ember.Object) {
        return this.itemFromRecord(object);
      } else {
        return object;
      }
    });
    return this._super(start, numRemoved, objectsAdded);
  },

  objectAtContent(idx) {
    const content = get(this, "content");
    if (!content || !content.length) {
      return;
    }

    const item = content.objectAt(idx);
    if (!item) {
      return;
    }

    // already inflated
    if (item.record) {
      return item.record;
    }

    item.record = this.findFetchRecordFromItem(item, false);

    item.record.get("promise").then(obj => {
      if (item.record instanceof MetaModel) {
        item.record.set("content", obj);
      } else {
        item.record = obj;
      }
    });

    return item.record;
  },

  objectAtContentAsPromise(idx) {
    const content = get(this, "content");
    if (!content || !content.length) {
      return Ember.RSVP.reject();
    }

    const item = content.objectAt(idx);
    if (!item) {
      return Ember.RSVP.reject();
    }

    // already inflated
    if (item.record) {
      // is the item.record a promise proxy, if so return that
      // so we end up with the actual object
      const promise = item.record.get("promise");
      if (promise) {
        return promise;
      }
      return Ember.RSVP.resolve(item.record);
    }

    const recordPromise = this.findFetchRecordFromItem(item, true);
    return recordPromise.then(record => {
      item.record = record;
      return record;
    });
  },

  // TODO - handle findOne failing (permissions / 404)
  findFetchRecordFromItem(item, returnPromise) {
    const store  = get(this, "store");
    const query  = get(this, "query");
    const type   = this.modelClassFromSnapshot(item.snapshot);

    let record;
    if (returnPromise) {
      record = store.fetchOne(type, item.id, query);
      return record.then(resolved => this.wrapRecordInMetaObjectIfNeccessary(resolved, item.snapshot) );
    } else {
      record = store.findOne(type, item.id, query);
      return this.wrapRecordInMetaObjectIfNeccessary(record, item.snapshot);
    }
  },

  wrapRecordInMetaObjectIfNeccessary(record, snapshot) {
    const as = get(this, "as");
    if (!as) {
      return record;
    }

    if (record instanceof MetaModel) {
      set(record, "parent", this);
      return record;
    }

    const store    = get(this, "store");
    const priority = snapshot ? snapshot.getPriority() : null;

    const meta = store.buildRecord(as, null, {
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

  onFirebaseChildAdded(snapshot, prevItemName) {
    const id      = snapshot.key();
    const content = get(this, "content");

    if (content.findBy('id', id)) { return; }

    const item = this.itemFromSnapshot(snapshot);
    this.insertAfter(prevItemName, item, content);
  },

  onFirebaseChildRemoved(snapshot) {
    const content = get(this, "content");
    const item    = content.findBy('id', snapshot.key());

    if (!item) { return; }

    content.removeObject(item);
  },

  onFirebaseChildMoved(snapshot, prevItemName) {
    const content = get(this, "content");
    const item    = content.findBy('id', snapshot.key());

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

  onFirebaseChildChanged(snapshot) {
    const content = get(this, "content");
    const item    = content.findBy('id', snapshot.key());

    if (!item) { return; }

    // if the type has changed, we need to fetch a new item
    // otherwise we can just ignore this and assume the model itself is listening
    const klass = this.modelClassFromSnapshot(snapshot);

    let record = item.record;
    if (record && this.get("as")) {
      record = record.get("content");
    }

    if (record && record.constructor.typeKey === klass.typeKey) {
      return;
    }

    // it's a polymorph whose type has changed, fetch a new item
    const index   = content.indexOf(item);
    const newItem = this.itemFromSnapshot(snapshot);

    content.replace(index, 1, [newItem]);
  }

});