import Ember from 'ember';
import Collection from './base';
import PromiseProxy from './promise';

const get = Ember.get;
const set = Ember.set;

// TODO - there's no need for this to be an ArrayProxy, make Collection a mixin instead

export default Collection.extend({

  toFirebaseJSON() {
    return this.reduce((json, item) => {
      json[get(item, 'id')] = item.toFirebaseJSON(true);
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

    // snapshot doesn't implement map

    const content = [];
    snapshot.forEach(child => {
      content.push(this.modelFromSnapshot(child));  // avoid implicit return as Snapshot#forEach cancels if you return true
    });

    // The observer happens too late for the initial content
    // so force it to setup right away
    this.setupParentage(content);

    set(this, "content", Ember.A(content));
  }),

  // if we're listening, then our existing children should be too
  listenToFirebase() {
    this.get("content").invoke("listenToFirebase");
    return this._super();
  },

  stopListeningToFirebase() {
    this.get("content").invoke("stopListeningToFirebase");
    return this._super();
  },

  replaceContent(start, numRemoved, objectsAdded) {
    this.setupParentage(objectsAdded);
    return this._super(start, numRemoved, objectsAdded);
  },

  // when we have a value (which is when listenToFirebase resolves)
  // then we know we have all our content because it all comes in
  // the same result
  fetch() {
    const promise = this.listenToFirebase().then(Ember.K.bind(this));
    return PromiseProxy.create({promise: promise});
  },

  contentChanged: Ember.on("init", Ember.observer("content", function() {
    if (this.get("content")) {
      this.setupParentage(this.get("content"));
    }
  })),

  setupParentage(items) {
    items.forEach((item) => {
      item.setProperties({
        parent:    this,
        parentKey: null
      });
    });
  },

  modelFromSnapshot(snapshot) {
    const modelName = this.modelClassFromSnapshot(snapshot);
    const store     = get(this, 'store');
    const query     = get(this, 'query') || {};

    return store.findInCacheOrCreateRecord(modelName, snapshot.ref(), Ember.merge({
      snapshot: snapshot,
      priority: snapshot.getPriority()
    }, query));
  },

  // TODO / OPTIMIZE - faster way of checking for existing inclusion instead of findBy("id") each check
  // on replaceContent we can build an ID map and then check that

  onFirebaseChildAdded(snapshot, prevItemName) {
    const id = snapshot.key();

    if (this.findBy('id', id)) { return; }

    const obj = this.modelFromSnapshot(snapshot);
    this.insertAfter(prevItemName, obj);

    // this needs to happen after insert, otherwise the parent isn't associated yet
    // and the reference is incorrect
    obj.listenToFirebase();
  },

  // TODO - should we destroy the item when removed?
  // TODO - should the item be removed from the store's cache?
  onFirebaseChildRemoved(snapshot) {
    const item = this.findBy('id', snapshot.key());
    if (!item) { return; }
    this.removeObject(item);
    item.stopListeningToFirebase();
  },

  onFirebaseChildMoved(snapshot, prevItemName) {
    const item = this.findBy('id', snapshot.key());
    if (!item) { return; }

    this.removeObject(item);
    set(item, 'priority', snapshot.getPriority());
    this.insertAfter(prevItemName, item);
  }

});