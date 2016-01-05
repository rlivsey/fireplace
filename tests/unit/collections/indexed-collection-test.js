import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

import Model from 'fireplace/model/model';
import attr  from 'fireplace/model/attr';
import MetaModel from 'fireplace/model/meta-model';
import IndexedCollection from 'fireplace/collections/indexed';

import { makeSnapshot } from '../../helpers/firebase';

const get = Ember.get;

let store, Person, Member, PeopleIndex, firebase;

function setupEnv() {
  firebase  = new window.MockFirebase("https://something.firebaseio.com");
  firebase.autoFlush(true);

  store = this.container.lookup("service:store");
  store.set("firebaseRoot", firebase);

  Person = Model.extend({
    name: attr(),
    priority: null
  });

  Member = MetaModel.extend({
    level: attr()
  });

  this.register("model:person", Person);
  this.register("model:member", Member);

  PeopleIndex = IndexedCollection.extend({
    firebaseReference: firebase.child("people-index"),
    store: store,
    model: "person"
  });
}

moduleFor("collection:indexed", "IndexedCollection - initializing", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("inflates from a snapshot if one exists", function(assert) {
  const snap = makeSnapshot("people-index", {
    123: true,
    234: true,
    456: true
  });

  const tom   = store.createRecord("person", {id: "123", name: "Tom"});
  store.saveRecord(tom);

  const dick  = store.createRecord("person", {id: "234", name: "Dick"});
  store.saveRecord(dick);

  const harry = store.createRecord("person", {id: "456", name: "Harry"});
  store.saveRecord(harry);

  const people = PeopleIndex.create({ snapshot: snap });

  assert.equal(get(people, "length"), 3, "added 3 items");
  assert.equal(people.get("firstObject.name"), "Tom");
  assert.deepEqual(people.mapBy("id"), ["123","234","456"], "has all the items in the right places");
});


test("wraps plain objects in meta models if necessary", function(assert) {
  const person = store.createRecord("person", {id: "123", name: "Tom"});
  const people = PeopleIndex.create({
    as: "member",
    content: Ember.A([person])
  });

  const obj = people.get("firstObject");

  assert.ok(obj instanceof Member, "item is wrapped in meta model");
  assert.equal(get(obj, 'content'), person, "meta model has item as content");
});

test("sets parent on meta models", function(assert) {
  const person = store.createRecord("person", {id: "123", name: "Tom"});
  const member = store.createRecord("member", { content: person, level: "admin" });
  const people = PeopleIndex.create({
    as: "member",
    content: Ember.A([member])
  });

  const obj = people.get("firstObject");

  assert.equal(get(obj, "parent"), people, "sets parent to collection");
});

moduleFor("collection:indexed", "IndexedCollection - fetching", {
  needs: ["service:store"],
  beforeEach() {
    setupEnv.call(this);

    // stick some data in to find
    firebase.child("people").set({
      tom:   { name: "Tom" },
      dick:  { name: "Dick" },
      harry: { name: "Harry" }
    });

    firebase.child("people-index").set({
      tom:   true,
      dick:  true,
      harry: true
    });
  }
});


test("fetch returns a promise proxy which resolves when the collection has a value", function(assert) {
  const done = assert.async();
  assert.expect(2);

  const people = PeopleIndex.create();

  people.fetch().then(function(c) {
    assert.equal(c, people, "resolves with itself");
    assert.equal(people.get("length"), 3, "has the items");
  }).finally(done);
});

test("resolves immediately if already listening to firebase", function(assert) {
  assert.expect(2);

  const people = PeopleIndex.create();
  people.listenToFirebase();

  Ember.run(function() {
    people.fetch().then(function(c) {
      assert.equal(c, people, "resolves with itself");
      assert.equal(people.get("length"), 3, "has the items");
    });
  });
});


moduleFor("collection:indexed", "IndexedCollection - Serializing", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("serializes children as id => true if they are plain models", function(assert) {
  const people = PeopleIndex.create({
    content: Ember.A([
      store.createRecord("person", {id: "123", name: "Tom"}),
      store.createRecord("person", {id: "234", name: "Dick"}),
      store.createRecord("person", {id: "345", name: "Harry"})
    ])
  });

  const json = people.toFirebaseJSON();

  assert.deepEqual(json, {
    123: true,
    234: true,
    345: true
  });
});


test("serializes children as id => meta model JSON if they are meta models", function(assert) {
  const people = PeopleIndex.create({
    content: Ember.A([
      store.createRecord("member", {
        level: "member",
        content: store.createRecord("person", {id: "123", name: "Tom"})
      }),
      store.createRecord("member", {
        level: "admin",
        content: store.createRecord("person", {id: "234", name: "Dick"})
      }),
      store.createRecord("member", {
        level: "member",
        content: store.createRecord("person", {id: "345", name: "Harry"}
      )})
    ])
  });

  const json = people.toFirebaseJSON();

  assert.deepEqual(json, {
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


moduleFor("collection:indexed", "IndexedCollection - adding items", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("sets the parent for meta-models so references are all setup", function(assert) {
  const people = PeopleIndex.create();

  const person = store.createRecord("person", {id: "123"});
  const member = store.createRecord("member", {content: person});

  people.pushObject(member);

  assert.equal(member.get("parent"), people, "sets the parent");
});

test("doesn't set the parent for non-meta-models", function(assert) {
  const people = PeopleIndex.create();

  const person = store.createRecord("person", {id: "123"});
  people.pushObject(person);

  assert.ok(!person.get("parent"), "parent is not set");
});

test("wraps objects in their meta models if `as` is set", function(assert) {
  const people = PeopleIndex.create({as: "member"});

  const person = store.createRecord("person", {id: "123"});
  people.pushObject(person);

  const obj = people.get("firstObject");

  assert.ok(obj instanceof Member, "item is wrapped in meta model");
  assert.ok(get(obj, 'content') instanceof Person, "content is a person");
  assert.equal(get(obj, 'content'), person, "meta model has item as content");
});

test("doesn't double wrap", function(assert) {
  const people = PeopleIndex.create({as: "member"});

  const person = store.createRecord("person", {id: "123"});
  const member = store.createRecord("member", {content: person});
  people.pushObject(member);

  const obj = people.get("firstObject");

  assert.ok(obj instanceof Member, "item is wrapped in meta model");
  assert.equal(get(obj, 'content'), person, "meta model has item as content");
});

moduleFor("collection:indexed", "IndexedCollection - finding items", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("fetches associated item by the ID", function(assert) {
  const done = assert.async();

  firebase.child("people").set({
    tom:   {name: "Tom"},
    dick:  {name: "Dick"},
    harry: {name: "Harry"}
  });

  const people = PeopleIndex.create({
    store: store,
    content: Ember.A([ // poke in the internal format, should never do this for reals
      {id: "tom"},
      {id: "dick"},
      {id: "harry"}
    ])
  });

  // will be a promise model, wait to resolve
  people.objectAt(0).then(person => {
    assert.equal(person.get("name"), "Tom");
  }).finally(done);
});

moduleFor("collection:indexed", "IndexedCollection - references", {
  needs: ["service:store"],
  beforeEach: setupEnv
});

test("generates a reference based on its model", function(assert) {
  const people = PeopleIndex.create({ firebaseReference: null });
  const ref = people.buildFirebaseReference();
  assert.equal(ref.toString(), firebase.child("people").toString(), "reference should be based off the model");
});

test("adding an item doesn't change its reference", function(assert) {
  const people = PeopleIndex.create();
  const person = store.createRecord("person", {id: "123"});

  let ref = person.buildFirebaseReference();
  assert.equal(ref.toString(), firebase.child("people/123").toString(), "reference should be based of the model ID");

  people.pushObject(person);

  ref = person.buildFirebaseReference();
  assert.equal(ref.toString(), firebase.child("people/123").toString(), "reference should not have changed");
});


let collection;
moduleFor("collection:indexed", "IndexedCollection - receiving updates from Firebase", {
  needs: ["service:store"],
  beforeEach() {
    setupEnv.call(this);

    firebase.child("people").set({
      tom:   {name: "Tom"},
      dick:  {name: "Dick"},
      harry: {name: "Harry"}
    });
    firebase.child("people-index").set({
      harry: true
    });

    collection = PeopleIndex.create({ model: "person" });
    collection.listenToFirebase();
  }
});


test("populates", function(assert) {
  collection.mapBy("name"); // force a fetch

  assert.equal(collection.get("length"), 1);
  assert.equal(collection.get("firstObject.name"), "Harry");
});

test("item added at start", function(assert) {
  firebase.child("people-index/dick").set(true);

  collection.mapBy("name"); // force a fetch

  assert.equal(collection.get("length"), 2);
  assert.equal(collection.get("firstObject.name"), "Dick"); // alphabetical order by key
});

test("item added at end", function(assert) {
  firebase.child("people-index/tom").set(true);

  collection.mapBy("name"); // force a fetch

  assert.equal(collection.get("length"), 2);
  assert.equal(collection.get("lastObject.name"), "Tom"); // alphabetical order by key
});

test("item removed", function(assert) {
  firebase.child("people-index/harry").remove();

  assert.equal(collection.get("length"), 0);
});

test("moving item", function(assert) {
  firebase.child("people-index/tom").set(true);
  firebase.child("people-index/dick").set(true);

  firebase.child("people-index/harry").setPriority(10); // 10 > null
  firebase.child("people-index/dick").setPriority(99);  // 99 > 10

  collection.mapBy("name"); // force a fetch

  assert.deepEqual(collection.mapBy("name"), ["Tom", "Harry", "Dick"], "should be in the right order");
  assert.deepEqual(collection.mapBy("priority"), [null, null, null], "doesn't change underlying object's priority");
});

moduleFor("collection:indexed", "IndexedCollection - with meta receiving updates from Firebase", {
  needs: ["service:store"],
  beforeEach() {
    setupEnv.call(this);

    firebase.child("people").set({
      tom:   {name: "Tom"},
      dick:  {name: "Dick"},
      harry: {name: "Harry"}
    });
    firebase.child("people-index").set({
      harry: { level: "senior" }
    });

    collection = PeopleIndex.create({ model: "person", as: "member" });
    collection.listenToFirebase();
  }
});

test("populates", function(assert) {
  collection.mapBy("name"); // force a fetch

  assert.equal(collection.get("length"), 1);
  assert.equal(collection.get("firstObject.name"), "Harry");
  assert.equal(collection.get("firstObject.level"), "senior");
});

test("item added", function(assert) {
  firebase.child("people-index/dick").set({level: "junior"});

  collection.mapBy("name"); // force a fetch

  assert.equal(collection.get("length"), 2);
  assert.equal(collection.get("firstObject.name"), "Dick");    // alphabetical order by key
  assert.equal(collection.get("firstObject.level"), "junior"); // alphabetical order by key
});

test("moving item", function(assert) {
  firebase.child("people-index/tom").set({level: "junior"});
  firebase.child("people-index/dick").set({level: "minor"});

  firebase.child("people-index/harry").setPriority(10); // 10 > null
  firebase.child("people-index/dick").setPriority(99);  // 99 > 10

  collection.mapBy("name"); // force a fetch

  assert.deepEqual(collection.mapBy("name"), ["Tom", "Harry", "Dick"], "should be in the right order");
  assert.deepEqual(collection.mapBy("priority"), [null, 10, 99], "sets the meta model's priority");
});

test("updating meta info", function(assert) {
  const harry = collection.objectAt(0);
  assert.equal(harry.get("level"), "senior");

  firebase.child("people-index/harry").set({level: "junior"});

  assert.equal(harry.get("level"), "junior");
});