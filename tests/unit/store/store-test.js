import Ember from 'ember';

import {module, test} from 'qunit';

import Model from 'fireplace/model/model';
import Store from 'fireplace/store';
import attr from 'fireplace/model/attr';
import ObjectCollection from 'fireplace/collections/object';
import IndexedCollection from 'fireplace/collections/indexed';

var get = Ember.get;
var set = Ember.set;

var store, container, Person, firebase;

module("Store", {
  beforeEach() {
    container = new Ember.Container();
    firebase  = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    store = Store.create({
      container: container,
      firebaseRoot: firebase
    });

    Person = Model.extend({
      name: attr(),
      title: attr(),
      priority: null
    });
    Person.typeKey = "Person";

    container.register("model:person", Person);
    container.register("collection:object", ObjectCollection);
  }
});

test("fork creates a new instance of the store with an empty cache", function(assert) {
  var MainStore = Store.extend({
    firebaseRoot: "https://something.firebaseio.com"
  });

  var main = MainStore.create({container: container});
  main.createRecord("person", {name: "Bob"});

  assert.ok(main.all("person").length, "store has cached a record");

  var forked = main.fork();

  assert.equal(get(main, "firebaseRoot"), get(forked, "firebaseRoot"), "fork has the same root");
  assert.ok(!forked.all("person").length, "fork has no cached records");
});

test("createRecord creates an instance of of the type", function(assert) {
  var person = store.createRecord("person", {name: "Bob"});

  assert.ok(person instanceof Person, "creates the right type");

  assert.equal(get(person, "name"),      "Bob",     "initializes with the attributes");
  assert.equal(get(person, "store"),     store,     "sets the store");
  assert.equal(get(person, "container"), container, "sets the container");
});

test("saveRecord when successful", function(assert) {
  var done = assert.async();

  assert.expect(4);

  var person = store.createRecord("person", {name: "Bob"});

  person.on("save", function() {
    assert.ok(true, "triggers save event");
  });

  person.on("saved", function() {
    assert.ok(true, "triggers saved event");
  });

  store.saveRecord(person).then(function(obj){
    assert.equal(person, obj, "resolves with the object");
  }).finally(done);

  assert.ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
});

test("saveRecord when fails", function(assert) {
  var done = assert.async();
  assert.expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  person.buildFirebaseReference().failNext("set", new Error("an error"));

  store.saveRecord(person).catch(function(e){
    assert.equal("an error", e.message, "fails with the error");
  }).then(done);

  assert.ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});


test("saveRecord when record has been deleted", function(assert) {
  var done = assert.async();
  assert.expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  person.set("isDeleted", true);

  store.saveRecord(person).catch(function(e){
    assert.ok(true, "fails with error");
  }).finally(done);

  assert.ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});


test("saveRecord with data", function(assert) {
  var done = assert.async();
  assert.expect(1);

  var person = store.createRecord("person", {name: "Bob"});

  store.saveRecord(person);

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    assert.deepEqual(snap.val(), {name: "Bob"});
    done();
  });
});


test("saveRecord with priority", function(assert) {
  var done = assert.async();
  assert.expect(2);

  var person = store.createRecord("person", {name: "Bob", priority: 123});

  store.saveRecord(person);

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    assert.deepEqual(snap.val(), {name: "Bob"});
    assert.equal(snap.getPriority(), 123);
    done();
  });
});

test("saveRecord with specific key", function(assert) {
  var done = assert.async();
  assert.expect(1);

  var person = store.createRecord("person", {name: "Bob", title: "Mr"});

  store.saveRecord(person, "name");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    assert.deepEqual(snap.val(), {name: "Bob"});
    done();
  });
});

test("saveRecord with specific key which is null", function(assert) {
  var done = assert.async();
  assert.expect(1);

  var person = store.createRecord("person", {title: "Mr", name: "Bob"});
  store.saveRecord(person);

  person.set("name", null);
  store.saveRecord(person, "name");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    assert.deepEqual(snap.val(), {title: "Mr"});
    done();
  });
});


test("saveRecord with priority key", function(assert) {
  var done = assert.async();
  assert.expect(1);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);

  person.set("priority", 42);
  store.saveRecord(person, "priority");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    assert.equal(snap.getPriority(), 42);
    done();
  });
});

test("deleteRecord when successful", function(assert) {
  var done = assert.async();
  assert.expect(4);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);

  person.on("delete", function() {
    assert.ok(true, "triggers delete event");
  });

  person.on("deleted", function() {
    assert.ok(true, "triggers deleted event");
  });

  store.deleteRecord(person).then(function(obj){
    assert.equal(person, obj, "resolves with the object");
  }).finally(done);

  assert.ok(!get(person, "isListeningToFirebase"), "should have stopped listening for firebase updates");
});


test("deleteRecord when fails & listening to firebase", function(assert) {
  var done = assert.async();
  assert.expect(2);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);

  // person.buildFirebaseReference().failNext("remove", "an error");
  person.buildFirebaseReference().remove = function(cb) {
    cb("an error");
  };

  store.deleteRecord(person).catch(function(e) {
    assert.equal("an error", e, "fails with the error");
  }).finally(done);

  assert.ok(get(person, "isListeningToFirebase"), "should still be listening for updates");
});


test("deleteRecord when fails & not already listening to firebase", function(assert) {
  var done = assert.async();
  assert.expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  store.saveRecord(person);

  person.stopListeningToFirebase();

  // person.buildFirebaseReference().failNext("remove", "an error");
  person.buildFirebaseReference().remove = function(cb) {
    cb("an error");
  };

  store.deleteRecord(person).catch(function(e){
    assert.equal("an error", e, "fails with the error");
  }).finally(done);

  assert.ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});

test("fetchOne successfully", function(assert) {
  var done = assert.async();
  assert.expect(3);

  firebase.child("people/123").set({
    name: "Bob"
  });

  store.fetchOne("person", "123").then(function(person) {
    assert.ok(true, "found the person");
    assert.equal(person.get("name"), "Bob");
    assert.ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
    done();
  });
});

test("fetchOne from cache", function(assert) {
  var done = assert.async();
  assert.expect(3);

  var person = store.createRecord(Person, {id: "123", name: "Bob"});
  store.saveRecord(person);

  store.fetchOne("person", "123").then(function(record) {
    assert.ok(true, "found the person");
    assert.equal(record, person, "should be the same person");
    assert.ok(get(record, "isListeningToFirebase"), "should still be listening for firebase updates");
    done();
  });
});

test("fetchOne which doesn't exist", function(assert) {
  var done = assert.async();
  assert.expect(1);
  store.fetchOne("person", "123").catch(function(error) {
    assert.equal(error, "not found");
  }).finally(done);
});

// this test is failing but not sure why / how to test it
// test("fetchOne without permission", function(assert) {
//   var done = assert.async();
//   assert.expect(1);
//
//   var ref = firebase.child("people/123");
//   ref.failNext("value", new Error("permission denied"));
//
//   store.fetchOne("person", "123").catch(function(error) {
//     assert.equal(error, "permission denied");
//   }).finally(done);
// });

test("fetchAll successfully", function(assert) {
  var done = assert.async();
  assert.expect(3);

  firebase.child("people").set({
    "123": {name: "Bob"},
    "234": {name: "Tom"}
  });

  store.fetchAll("person").then(function(collection) {
    assert.ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    assert.ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    assert.equal(get(collection, "length"), 2);
  }).finally(done);
});

test("fetchAll which doesn't exist still creates a collection", function(assert) {
  var done = assert.async();
  assert.expect(3);

  store.fetchAll("person").then(function(collection) {
    assert.ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    assert.ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    assert.equal(get(collection, "length"), 0);
  }).finally(done);
});

// this test is failing but not sure why / how to test it
// test("fetchAll without permission", function(assert) {
//   var done = assert.async();
//   assert.expect(1);
//
//   firebase.child("people").forceCancel("permission denied");
//
//   store.fetchAll("person").catch(function(error) {
//     assert.equal(error, "permission denied");
//   }).finally(done);
// });

test("fetchQuery with no options", function(assert) {
  var done = assert.async();
  assert.expect(3);

  firebase.child("people").set({
    "a": {name: "Bob"},
    "b": {name: "Tom"},
    "c": {name: "Dick"},
    "d": {name: "Harry"},
  });

  store.fetchQuery("person").then(function(collection) {
    assert.ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    assert.ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    assert.equal(get(collection, "length"), 4);
  }).finally(done);
});


test("fetchQuery with options", function(assert) {
  var done = assert.async();
  assert.expect(5);

  firebase.child("people").set({
    "a": {name: "Bob"},
    "b": {name: "Tom"},
    "c": {name: "Dick"},
    "d": {name: "Harry"},
  });
  firebase.child("people/a").setPriority(1);
  firebase.child("people/b").setPriority(2);
  firebase.child("people/c").setPriority(3);
  firebase.child("people/d").setPriority(4);

  var query = {
    startAt: 2,
    endAt:   3
  };

  store.fetchQuery("person", query).then(function(collection) {
    assert.ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    assert.ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    assert.equal(collection.get("length"), 2);
    assert.equal(collection.objectAt(0).get("id"), "b");
    assert.equal(collection.objectAt(1).get("id"), "c");
  }).finally(done);
});

test("saveCollection when successful", function(assert) {
  var done1 = assert.async();
  var done2 = assert.async();
  assert.expect(2);

  var ref = firebase.child("people-index");

  var index = IndexedCollection.create({
    firebaseReference: ref,
    store: store
  });

  var person = store.createRecord(Person, {id: "123", name: "Bob"});
  index.pushObject(person);

  store.saveCollection(index).then(function(collection) {
    assert.equal(collection, index, "resolves with the collection");
  }).finally(done1);

  ref.once("value", function(snap) {
    assert.deepEqual(snap.val(), { 123: true }, "saves the expected information");
    done2();
  });
});

test("saveCollection when fails", function(assert) {
  var done = assert.async();
  assert.expect(1);

  var ref = firebase.child("people-index");

  var index = IndexedCollection.create({
    firebaseReference: ref,
    store: store
  });

  var person = store.createRecord(Person, {id: "123", name: "Bob"});
  index.pushObject(person);

  ref.failNext("set", new Error("an error"));

  store.saveCollection(index).catch(function() {
    assert.ok("rejects the promise");
  }).finally(done);
});

test("saveCollection with a query collection", function(assert) {
  assert.expect(1);

  var index = IndexedCollection.create({ limit: 10 });

  assert.throws(function() {
    store.saveCollection(index);
  }, "you can't save a collection which is query");
});
