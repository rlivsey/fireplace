import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

import Model from 'fireplace/model/model';
import attr  from 'fireplace/model/attr';
import ObjectCollection from 'fireplace/collections/object';

import { getSnapshot } from '../../helpers/firebase';

const get  = Ember.get;

let store, Person, People, firebase;

function setupEnv() {
  firebase  = new window.window.MockFirebase("https://something.firebaseio.com");
  firebase.autoFlush(true);

  store = this.container.lookup("service:store");
  store.set("firebaseRoot", firebase);

  Person = Model.extend({
    name: attr(),
    priority: null
  });

  this.register("model:person", Person);

  People = ObjectCollection.extend({
    model: "person",
    store
  });

  firebase.child("people/123").setWithPriority({name: "Tom"},   10);
  firebase.child("people/234").setWithPriority({name: "Dick"},  20);
  firebase.child("people/456").setWithPriority({name: "Harry"}, 30);
}

moduleFor("collection:object", "ObjectCollection - initializing", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("inflates from a snapshot if one exists", function(assert) {
  const snap   = getSnapshot(firebase, "people");
  const people = People.create({snapshot: snap});

  assert.equal(get(people, "length"), 3, "added 3 items");

  const person = people.objectAt(0);
  assert.ok(person instanceof Person, "has instantiated the models");
  assert.deepEqual(people.mapBy("name"), ["Tom", "Dick", "Harry"], "has assigned the attributes");
  assert.deepEqual(people.mapBy("priority"), [10,20,30], "has assigned the priorities");
});

test("fetches from Firebase when start listening", function(assert) {
  const people = People.create();
  people.listenToFirebase();

  assert.equal(get(people, "length"), 3, "added 3 items");

  const person = people.objectAt(0);
  assert.ok(person instanceof Person, "has instantiated the models");
  assert.deepEqual(people.mapBy("name"), ["Tom", "Dick", "Harry"], "has assigned the attributes");
  assert.deepEqual(people.mapBy("priority"), [10,20,30], "has assigned the priorities");
});

moduleFor("collection:object", "ObjectCollection - references", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("generates a reference based on its model", function(assert) {
  const people = People.create();
  const ref = people.buildFirebaseReference();
  assert.equal(ref.toString(), firebase.child("people").toString(), "reference should be based off the model");
});

test("Adding an item sets its reference to be a child of the collection", function(assert) {
  const collectionRef = firebase.child("some/other/path");

  const people = People.create({ firebaseReference: collectionRef });
  const person = store.createRecord("person", {id: "987", name: "Bob"});

  people.pushObject(person);

  const ref = person.buildFirebaseReference();
  assert.equal(ref.toString(), collectionRef.child("987").toString(), "reference should be child of the collection");
});

// This is important so you can remove an object and then delete it to persist the change
// otherwise you'd remove it and if you delete then it'll try and delete the wrong path
// although in that case you could just delete the object and it'll get removed from the
// collection anyway...
test("Removing an item doesn't lose its reference", function(assert) {
  const collectionRef = firebase.child("some/other/path");

  const people = People.create({store: store, firebaseReference: collectionRef});
  const person = store.createRecord("person", {id: "987", name: "Bob"});

  people.pushObject(person);
  people.removeObject(person);

  const ref = person.buildFirebaseReference();
  assert.equal(ref.toString(), collectionRef.child("987").toString(), "reference still should be child of the collection");
});

moduleFor("collection:object", "ObjectCollection - fetching", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("fetch returns a promise proxy which resolves when the collection has a value", function(assert) {
  assert.expect(2);
  const done = assert.async();

  const people = People.create();
  const promise = people.fetch();

  promise.then(function(c) {
    assert.equal(c, people, "resolves with itself");
    assert.equal(people.get("length"), 3, "has the items");
  }).finally(done);
});

test("resolves immediately if already listening to firebase", function(assert) {
  assert.expect(2);

  const people = People.create();
  people.listenToFirebase();

  Ember.run(function() {
    people.fetch().then(function(c) {
      assert.equal(c, people, "resolves with itself");
      assert.equal(people.get("length"), 3, "has the items");
    });
  });
});

moduleFor("collection:object", "ObjectCollection - serializing", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("serializes children to Firebase JSON", function(assert) {
  const people = People.create({
    content: Ember.A([
      store.createRecord("person", {id: "123", name: "Tom"}),
      store.createRecord("person", {id: "234", name: "Dick"}),
      store.createRecord("person", {id: "345", name: "Harry"})
    ])
  });

  const json = people.toFirebaseJSON();

  assert.deepEqual(json, {
    123: {
      name: "Tom"
    },
    234: {
      name: "Dick"
    },
    345: {
      name: "Harry"
    }
  });
});

test("serializes children to Firebase JSON includes priorities", function(assert) {
  const people = People.create({
    content: Ember.A([
      store.createRecord("person", {id: "123", priority: 1, name: "Tom"}),
      store.createRecord("person", {id: "234", priority: 2, name: "Dick"}),
      store.createRecord("person", {id: "345", priority: 3, name: "Harry"})
    ])
  });

  const json = people.toFirebaseJSON();

  assert.deepEqual(json, {
    123: {
      ".value": { name: "Tom" },
      ".priority": 1
    },
    234: {
      ".value": { name: "Dick" },
      ".priority": 2
    },
    345: {
      ".value": { name: "Harry" },
      ".priority": 3
    }
  });

});

let collection;
moduleFor("collection:object", "ObjectCollection - receiving updates from Firebase", {
  needs: ["service:store"],
  beforeEach() {
    setupEnv.call(this);
    collection = People.create();
    collection.listenToFirebase();
  }
});

test("adding item to the end", function(assert) {
  firebase.child("people/987").setWithPriority({ name: "George" }, 50);

  assert.equal(collection.get("length"), 4, "adds an item");
  assert.equal(collection.get("lastObject.name"), "George", "adds to the right place");
});

test("adding item to the start", function(assert) {
  firebase.child("people/987").setWithPriority({ name: "George" }, 1);

  assert.equal(collection.get("length"), 4, "adds an item");
  assert.equal(collection.get("firstObject.name"), "George", "adds to the right place");
});

test("adding item in the middle", function(assert) {
  firebase.child("people/987").setWithPriority({ name: "George" }, 25);

  assert.equal(collection.get("length"), 4, "adds an item");
  assert.equal(collection.objectAt(2).get("name"), "George", "adds to the right place");
});

test("removing an item", function(assert) {
  firebase.child("people/234").remove();

  assert.equal(collection.get("length"), 2, "adds an item");
  assert.deepEqual(collection.mapBy("name"), ["Tom", "Harry"], "removes the right item");
});

test("moving an item", function(assert) {
  firebase.child("people/234").setPriority(1);

  assert.deepEqual(collection.mapBy("name"), ["Dick", "Tom", "Harry"], "moves the item");
  assert.deepEqual(collection.mapBy("priority"), [1, 10, 30], "updates the priorities");
});

test("listening to firebase recurses to its children", function(assert) {
  collection.stopListeningToFirebase();
  assert.ok(!get(collection, "isListeningToFirebase"), "collection isn't listening");
  assert.ok(collection.isEvery("isListeningToFirebase", false), "none are listening");

  collection.listenToFirebase();

  assert.ok(get(collection, "isListeningToFirebase"), "collection is listening");
  assert.ok(collection.isEvery("isListeningToFirebase", true), "all are listening");

  collection.stopListeningToFirebase();

  assert.ok(!get(collection, "isListeningToFirebase"), "collection isn't listening");
  assert.ok(collection.isEvery("isListeningToFirebase", false), "none are listening");
});

let Thing, Other;
moduleFor("collection:object", "ObjectCollection - polymorphism", {
  needs: ["service:store"],
  beforeEach() {
    firebase  = new window.window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    store = this.container.lookup("service:store");
    store.set("firebaseRoot", firebase);

    Thing = Model.extend({
      name: attr()
    });

    Other = Model.extend({
      name: attr()
    });

    this.register("model:thing", Thing);
    this.register("model:other", Other);

    firebase.child("things/123").set({name: "One",   type: "thing"});
    firebase.child("things/234").set({name: "Two",   type: "other"});
    firebase.child("things/456").set({name: "Three", type: "thing"});

    const PolyCollection = ObjectCollection.extend({
      store: store,
      firebaseReference: firebase.child("things"),
      modelClassFromSnapshot(snapshot) {
        return snapshot.val().type;
      }
    });

    collection = PolyCollection.create();
    collection.listenToFirebase();
  }
});

test("loads the right record types", function(assert) {
  assert.ok(collection.objectAt(0) instanceof Thing);
  assert.ok(collection.objectAt(1) instanceof Other);
  assert.ok(collection.objectAt(2) instanceof Thing);
});
