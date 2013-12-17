require('fireplace/collections/collection');

var get = Ember.get,
    set = Ember.set;

FP.ObjectCollection = FP.Collection.extend({

  toFirebaseJSON: function() {
    return this.reduce(function(json, item) {
      json[get(item, 'id')] = item.toFirebaseJSON(true);
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
      content.push(_this.modelFromSnapshot(child));
    });
    set(this, "content", content);
  }),

  // if we're listening, then our existing children should be too
  listenToFirebase: function() {
    this.invoke("listenToFirebase");
    return this._super();
  },

  stopListeningToFirebase: function() {
    this.invoke("stopListeningToFirebase");
    return this._super();
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    this.setupParentage(objectsAdded);
    return this._super(start, numRemoved, objectsAdded);
  },

  hasLoadedAllChildren: function() {
    var snapshot = get(this, "snapshot");
    return snapshot && snapshot.numChildren() === get(this, "length");
  }.property("length", "snapshot"),

  // WIP - experimental & untested
  fetch: function() {
    if (get(this, "hasLoadedAllChildren")) {
      return Ember.RSVP.resolve(this);
    }

    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var observerFunc = function() {
        if (get(_this, "hasLoadedAllChildren")) {
          _this.removeObserver("hasLoadedAllChildren", _this, observerFunc);
          resolve(_this);
        }
      };

      _this.addObserver("hasLoadedAllChildren", _this, observerFunc);

      // TODO - how do we know if this fails?
      // should we have a private promise / var somewhere to know the status?
      // or maybe listenToFirebase returns a promise against on("value")?
      if (!get(this, "isListeningToFirebase")) {
        _this.listenToFirebase();
      }
    });
  },

  contentChanged: function() {
    this.setupParentage(this);
  }.observes("content").on("init"),

  setupParentage: function(items) {
    items.forEach(function(item) {
      item.setProperties({
        parent:    this,
        parentKey: null
      });
    }, this);
  },

  modelFromSnapshot: function(snapshot) {
    var id        = snapshot.name(),
        modelName = this.modelClassFromSnapshot(snapshot),
        store     = get(this, 'store'),
        query     = get(this, 'query') || {};

    return store.findInCacheOrCreateRecord(modelName, snapshot.ref(), Ember.merge({
      snapshot: snapshot,
      priority: snapshot.getPriority()
    }, query));
  },

  // TODO / OPTIMIZE - faster way of checking for existing inclusion instead of findBy("id") each check
  // on replaceContent we can build an ID map and then check that

  onFirebaseChildAdded: function(snapshot, prevItemName) {
    var id = snapshot.name();

    if (this.findBy('id', id)) { return; }

    var obj = this.modelFromSnapshot(snapshot);
    this.insertAfter(prevItemName, obj);

    // this needs to happen after insert, otherwise the parent isn't associated yet
    // and the reference is incorrect
    obj.listenToFirebase();
  },

  // TODO - should we destroy the item when removed?
  // TODO - should the item be removed from the store's cache?
  onFirebaseChildRemoved: function(snapshot) {
    var item = this.findBy('id', snapshot.name());
    if (!item) { return; }
    this.removeObject(item);
    item.stopListeningToFirebase();
  },

  onFirebaseChildMoved: function(snapshot, prevItemName) {
    var item = this.findBy('id', snapshot.name());
    if (!item) { return; }

    this.removeObject(item);
    set(item, 'priority', snapshot.getPriority());
    this.insertAfter(prevItemName, item);
  }

});