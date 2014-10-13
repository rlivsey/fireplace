import Ember from 'ember';

import Model from 'fireplace/model/model';
import Store from 'fireplace/store';
import attr  from 'fireplace/model/attr';
import MetaModel from 'fireplace/model/meta-model';
import IndexedCollection from 'fireplace/collections/indexed';

import { makeSnapshot } from '../../helpers/firebase';

var get = Ember.get;

var container, store, Person, PeopleIndex, firebase;

function setupEnv() {
  firebase  = new MockFirebase("https://something.firebaseio.com");
  container = new Ember.Container();
  store     = Store.create({
    container:    container,
    firebaseRoot: firebase
  });

  Person = Model.extend({
    name: attr(),
    priority: null
  });
  Person.typeKey = "Person";
  container.register("model:person", Person);

  PeopleIndex = IndexedCollection.extend({
    firebaseReference: firebase.child("people-index"),
    store: store,
    model: Person
  });
}

module("IndexedCollection - initializing", {
  setup: setupEnv
});

test("inflates from a snapshot if one exists", function() {
  var snap = makeSnapshot("people-index", {
    123: true,
    234: true,
    456: true
  });

  var tom   = store.createRecord("person", {id: "123", name: "Tom"});
  store.saveRecord(tom);

  var dick  = store.createRecord("person", {id: "234", name: "Dick"});
  store.saveRecord(dick);

  var harry = store.createRecord("person", {id: "456", name: "Harry"});
  store.saveRecord(harry);

  firebase.flush();

  var people = PeopleIndex.create({store: store, snapshot: snap});

  equal(get(people, "length"), 3, "added 3 items");
  equal(people.get("firstObject.name"), "Tom");
  deepEqual(people.mapBy("id"), ["123","234","456"], "has all the items in the right places");
});


test("wraps plain objects in meta models if necessary", function() {
  var Member = MetaModel.extend({
    level: attr()
  });

  var person = store.createRecord("person", {id: "123", name: "Tom"});
  var people = PeopleIndex.create({
    as: Member,
    content: [ person ]
  });

  var obj = people.get("firstObject");

  ok(obj instanceof Member, "item is wrapped in meta model");
  equal(get(obj, 'content'), person, "meta model has item as content");
});

module("IndexedCollection - fetching", {
  setup: function() {
    setupEnv();

    // stick some data in to find
    firebase.child("people").set({
      tom:   {name: "Tom"},
      dick:  {name: "Dick"},
      harry: {name: "Harry"}
    });

    firebase.child("people-index").set({
      tom:   true,
      dick:  true,
      harry: true
    });

    firebase.flush();
  }
});

test("fetch returns a promise which resolves when the collection has a value", function() {
  expect(2);

  var people = PeopleIndex.create();

  people.fetch().then(function(c) {
    equal(c, people, "resolves with itself");
    equal(people.get("length"), 3, "has the items");
  });

  // we need two flushes because the first kicks off the fetches for the objects
  firebase.flush();
  firebase.flush();
});

test("resolves immediately if already listening to firebase", function() {
  expect(2);

  var people = PeopleIndex.create();
  people.listenToFirebase();
  // we need two flushes because the first kicks off the fetches for the objects
  firebase.flush();
  firebase.flush();

  Ember.run(function() {
    people.fetch().then(function(c) {
      equal(c, people, "resolves with itself");
      equal(people.get("length"), 3, "has the items");
    });
  });
});



module("IndexedCollection - serializing", {
  setup: setupEnv
});

test("serializes children as id => true if they are plain models", function() {
  var people = PeopleIndex.create({
    content: [
      store.createRecord("person", {id: "123", name: "Tom"}),
      store.createRecord("person", {id: "234", name: "Dick"}),
      store.createRecord("person", {id: "345", name: "Harry"})
    ]
  });

  var json = people.toFirebaseJSON();

  deepEqual(json, {
    123: true,
    234: true,
    345: true
  });
});


test("serializes children as id => meta model JSON if they are meta models", function() {
  var Member = MetaModel.extend({
    level: attr()
  });

  var people = PeopleIndex.create({
    content: [
      store.createRecord(Member, {
        level: "member",
        content: store.createRecord(Person, {id: "123", name: "Tom"})
      }),
      store.createRecord(Member, {
        level: "admin",
        content: store.createRecord(Person, {id: "234", name: "Dick"})
      }),
      store.createRecord(Member, {
        level: "member",
        content: store.createRecord(Person, {id: "345", name: "Harry"}
      )})
    ]
  });

  var json = people.toFirebaseJSON();

  deepEqual(json, {
    123: {
      level: "member"
    },
    234: {
      level: "admin"
    },
    345: {
      level: "member"
    }
  });
});


module("IndexedCollection - adding items", {
  setup: setupEnv
});

test("sets the parent for meta-models so references are all setup", function() {
  var Member = MetaModel.extend();

  var people = PeopleIndex.create();

  var person = store.createRecord(Person, {id: "123"});
  var member = store.createRecord(Member, {content: person});

  people.pushObject(member);

  equal(member.get("parent"), people, "sets the parent");
});

test("doesn't set the parent for non-meta-models", function() {
  var Member = MetaModel.extend();

  var people = PeopleIndex.create();

  var person = store.createRecord(Person, {id: "123"});
  people.pushObject(person);

  ok(!person.get("parent"), "parent is not set");
});

test("wraps objects in their meta models if `as` is set", function() {
  var Member = MetaModel.extend({
    level: attr()
  });

  var people = PeopleIndex.create({as: Member});

  var person = store.createRecord(Person, {id: "123"});
  people.pushObject(person);

  var obj = people.get("firstObject");

  ok(obj instanceof Member, "item is wrapped in meta model");
  ok(get(obj, 'content') instanceof Person, "content is a person");
  equal(get(obj, 'content'), person, "meta model has item as content");
});

test("doesn't double wrap", function() {
  var Member = MetaModel.extend({
    level: attr()
  });

  var people = PeopleIndex.create({as: Member});

  var person = store.createRecord(Person, {id: "123"});
  var member = store.createRecord(Member, {content: person});
  people.pushObject(member);

  var obj = people.get("firstObject");

  ok(obj instanceof Member, "item is wrapped in meta model");
  equal(get(obj, 'content'), person, "meta model has item as content");
});


module("IndexedCollection - finding items", {
  setup: setupEnv
});

test("fetches associated item by the ID", function() {
  firebase.child("people").set({
    tom:   {name: "Tom"},
    dick:  {name: "Dick"},
    harry: {name: "Harry"}
  });
  firebase.flush();

  var people = PeopleIndex.create({
    store: store,
    content: [ // poke in the internal format, should never do this for reals
      {id: "tom"},
      {id: "dick"},
      {id: "harry"}
    ]
  });

  var person = people.objectAt(0);
  firebase.flush();

  equal(person.get("name"), "Tom");
});


module("IndexedCollection - references", {
  setup: setupEnv
});

test("generates a reference based on its model", function() {
  var people = PeopleIndex.create({store: store, firebaseReference: null});
  var ref = people.buildFirebaseReference();
  equal(ref.toString(), firebase.child("people").toString(), "reference should be based off the model");
});

test("adding an item doesn't change its reference", function() {
  var people = PeopleIndex.create({store: store});
  var person = store.createRecord(Person, {id: "123"});

  var ref = person.buildFirebaseReference();
  equal(ref.toString(), firebase.child("people/123").toString(), "reference should be based of the model ID");

  people.pushObject(person);

  ref = person.buildFirebaseReference();
  equal(ref.toString(), firebase.child("people/123").toString(), "reference should not have changed");
});



var collection;
module("IndexedCollection - receiving updates from Firebase", {
  setup: function() {
    setupEnv();

    firebase.child("people").set({
      tom:   {name: "Tom"},
      dick:  {name: "Dick"},
      harry: {name: "Harry"}
    });
    firebase.child("people-index").set({
      harry: true
    });

    collection = PeopleIndex.create({store: store, model: Person});
    collection.listenToFirebase();
    firebase.flush();
  }
});

test("populates", function() {
  collection.mapBy("name"); // force a fetch
  firebase.flush();

  equal(collection.get("length"), 1);
  equal(collection.get("firstObject.name"), "Harry");
});

test("item added at start", function() {
  firebase.child("people-index/dick").set(true);
  firebase.flush();

  collection.mapBy("name"); // force a fetch
  firebase.flush();

  equal(collection.get("length"), 2);
  equal(collection.get("firstObject.name"), "Dick"); // alphabetical order by key
});

test("item added at end", function() {
  firebase.child("people-index/tom").set(true);
  firebase.flush();

  collection.mapBy("name"); // force a fetch
  firebase.flush();

  equal(collection.get("length"), 2);
  equal(collection.get("lastObject.name"), "Tom"); // alphabetical order by key
});

test("item removed", function() {
  firebase.child("people-index/harry").remove();
  firebase.flush();

  equal(collection.get("length"), 0);
});

test("moving item", function() {
  firebase.child("people-index/tom").set(true);
  firebase.child("people-index/dick").set(true);

  firebase.child("people-index/harry").setPriority(10); // 10 > null
  firebase.child("people-index/dick").setPriority(99);  // 99 > 10
  firebase.flush();

  collection.mapBy("name"); // force a fetch
  firebase.flush();

  deepEqual(collection.mapBy("name"), ["Tom", "Harry", "Dick"], "should be in the right order");
  deepEqual(collection.mapBy("priority"), [null, null, null], "doesn't change underlying object's priority");
});


module("IndexedCollection - with meta receiving updates from Firebase", {
  setup: function() {
    setupEnv();

    var Member = MetaModel.extend({
      level: attr()
    });

    firebase.child("people").set({
      tom:   {name: "Tom"},
      dick:  {name: "Dick"},
      harry: {name: "Harry"}
    });
    firebase.child("people-index").set({
      harry: { level: "senior" }
    });

    collection = PeopleIndex.create({store: store, model: Person, as: Member});
    collection.listenToFirebase();
    firebase.flush();
  }
});

test("populates", function() {
  collection.mapBy("name"); // force a fetch
  firebase.flush();

  equal(collection.get("length"), 1);
  equal(collection.get("firstObject.name"), "Harry");
  equal(collection.get("firstObject.level"), "senior");
});

test("item added", function() {
  firebase.child("people-index/dick").set({level: "junior"});
  firebase.flush();

  collection.mapBy("name"); // force a fetch
  firebase.flush();

  equal(collection.get("length"), 2);
  equal(collection.get("firstObject.name"), "Dick");    // alphabetical order by key
  equal(collection.get("firstObject.level"), "junior"); // alphabetical order by key
});

test("moving item", function() {
  firebase.child("people-index/tom").set({level: "junior"});
  firebase.child("people-index/dick").set({level: "minor"});

  firebase.child("people-index/harry").setPriority(10); // 10 > null
  firebase.child("people-index/dick").setPriority(99);  // 99 > 10
  firebase.flush();

  collection.mapBy("name"); // force a fetch
  firebase.flush();

  deepEqual(collection.mapBy("name"), ["Tom", "Harry", "Dick"], "should be in the right order");
  deepEqual(collection.mapBy("priority"), [null, 10, 99], "sets the meta model's priority");
});

test("updating meta info", function() {
  var harry = collection.objectAt(0);
  equal(harry.get("level"), "senior");

  firebase.child("people-index/harry").set({level: "junior"});
  firebase.flush();

  equal(harry.get("level"), "junior");
});