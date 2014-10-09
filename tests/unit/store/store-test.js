import Ember from 'ember';

import Model from 'fireplace/model/model';
import Store from 'fireplace/store';
import attr from 'fireplace/model/attr';
import ObjectCollection from 'fireplace/collections/object';

var get = Ember.get;
var set = Ember.set;

var store, container, Person, firebase;

module("Store", {
  setup: function() {
    container = new Ember.Container();
    firebase  = new MockFirebase("https://something.firebaseio.com");

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

test("fork creates a new instance of the store with an empty cache", function() {
  var MainStore = Store.extend({
    firebaseRoot: "https://something.firebaseio.com"
  });

  var main = MainStore.create({container: container});
  main.createRecord("person", {name: "Bob"});

  ok(main.all("person").length, "store has cached a record");

  var forked = main.fork();

  equal(get(main, "firebaseRoot"), get(forked, "firebaseRoot"), "fork has the same root");
  ok(!forked.all("person").length, "fork has no cached records");
});

test("createRecord creates an instance of of the type", function() {
  var person = store.createRecord("person", {name: "Bob"});

  ok(person instanceof Person, "creates the right type");

  equal(get(person, "name"),      "Bob",     "initializes with the attributes");
  equal(get(person, "store"),     store,     "sets the store");
  equal(get(person, "container"), container, "sets the container");
});

test("saveRecord when successful", function() {
  expect(4);

  var person = store.createRecord("person", {name: "Bob"});

  person.on("save", function() {
    ok(true, "triggers save event");
  });

  person.on("saved", function() {
    ok(true, "triggers saved event");
  });

  store.saveRecord(person).then(function(obj){
    equal(person, obj, "resolves with the object");
  });

  firebase.flush();

  ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
});

test("saveRecord when fails", function() {
  expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  person.buildFirebaseReference().failNext("set", "an error");

  store.saveRecord(person).catch(function(e){
    equal("an error", e, "fails with the error");
  });

  firebase.flush();

  ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});


test("saveRecord when record has been deleted", function() {
  expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  person.set("isDeleted", true);

  store.saveRecord(person).catch(function(e){
    ok(true, "fails with error");
  });

  firebase.flush();

  ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});


test("saveRecord with data", function() {
  expect(1);

  var person = store.createRecord("person", {name: "Bob"});

  store.saveRecord(person);

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    deepEqual(snap.val(), {name: "Bob"});
  });

  firebase.flush();
});


test("saveRecord with priority", function() {
  expect(2);

  var person = store.createRecord("person", {name: "Bob", priority: 123});

  store.saveRecord(person);

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    deepEqual(snap.val(), {name: "Bob"});
    equal(snap.getPriority(), 123);
  });

  firebase.flush();
});

test("saveRecord with specific key", function() {
  expect(1);

  var person = store.createRecord("person", {name: "Bob", title: "Mr"});

  store.saveRecord(person, "name");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    deepEqual(snap.val(), {name: "Bob"});
  });

  firebase.flush();
});

test("saveRecord with specific key which is null", function() {
  expect(1);

  var person = store.createRecord("person", {title: "Mr", name: "Bob"});
  store.saveRecord(person);
  firebase.flush();

  person.set("name", null);
  store.saveRecord(person, "name");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    deepEqual(snap.val(), {title: "Mr"});
  });

  firebase.flush();
});


test("saveRecord with priority key", function() {
  expect(1);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);
  firebase.flush();

  person.set("priority", 42);
  store.saveRecord(person, "priority");

  firebase.child("people").child(person.get("id")).once("value", function(snap) {
    equal(snap.getPriority(), 42);
  });

  firebase.flush();
});

test("deleteRecord when successful", function() {
  expect(4);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);
  firebase.flush();

  person.on("delete", function() {
    ok(true, "triggers delete event");
  });

  person.on("deleted", function() {
    ok(true, "triggers deleted event");
  });

  store.deleteRecord(person).then(function(obj){
    equal(person, obj, "resolves with the object");
  });

  firebase.flush();

  ok(!get(person, "isListeningToFirebase"), "should have stopped listening for firebase updates");
});


test("deleteRecord when fails & listening to firebase", function() {
  expect(2);

  var person = store.createRecord("person", {name: "Bob"});
  store.saveRecord(person);
  firebase.flush();

  // person.buildFirebaseReference().failNext("remove", "an error");
  person.buildFirebaseReference().remove = function(cb) {
    cb("an error");
  };

  Ember.run(function() {
    store.deleteRecord(person).catch(function(e) {
      equal("an error", e, "fails with the error");
    });

    firebase.flush();
  });

  ok(get(person, "isListeningToFirebase"), "should still be listening for updates");
});


test("deleteRecord when fails & not already listening to firebase", function() {
  expect(2);

  var person = store.createRecord("person", {name: "Bob"});

  store.saveRecord(person);
  firebase.flush();

  person.stopListeningToFirebase();

  // person.buildFirebaseReference().failNext("remove", "an error");
  person.buildFirebaseReference().remove = function(cb) {
    cb("an error");
  };

  Ember.run(function() {
    store.deleteRecord(person).catch(function(e){
      equal("an error", e, "fails with the error");
    });

    firebase.flush();
  });

  ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
});

test("fetchOne successfully", function() {
  expect(3);

  firebase.child("people/123").set({
    name: "Bob"
  });
  firebase.flush();

  store.fetchOne("person", "123").then(function(person) {
    ok(true, "found the person");
    equal(person.get("name"), "Bob");
    ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
  });

  firebase.flush();
});

test("fetchOne from cache", function() {
  expect(3);

  var person = store.createRecord(Person, {id: "123", name: "Bob"});
  store.saveRecord(person);
  firebase.flush();

  Ember.run(function() {
    store.fetchOne("person", "123").then(function(record) {
      ok(true, "found the person");
      equal(record, person, "should be the same person");
      ok(get(record, "isListeningToFirebase"), "should still be listening for firebase updates");
    });

    firebase.flush();
  });
});

test("fetchOne which doesn't exist", function() {
  expect(1);
  store.fetchOne("person", "123").catch(function(error) {
    equal(error, "not found");
  });
  firebase.flush();
});

test("fetchOne without permission", function() {
  expect(1);

  var ref = firebase.child("people/123");

  Ember.run(function() {
    store.fetchOne("person", "123").catch(function(error) {
      equal(error, "permission denied");
    });

    ref.forceCancel("permission denied", "value");
  });
});


test("fetchAll successfully", function() {
  expect(3);

  firebase.child("people").set({
    "123": {name: "Bob"},
    "234": {name: "Tom"}
  });
  firebase.flush();

  store.fetchAll("person").then(function(collection) {
    ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    equal(get(collection, "length"), 2);
  });
  firebase.flush();
});

test("fetchAll which doesn't exist still creates a collection", function() {
  expect(3);

  store.fetchAll("person").then(function(collection) {
    ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    equal(get(collection, "length"), 0);
  });
  firebase.flush();
});

test("fetchAll without permission", function() {
  expect(1);

  Ember.run(function() {
    store.fetchAll("person").catch(function(error) {
      equal(error, "permission denied");
    });

    firebase.child("people").forceCancel("permission denied");
  });
});


test("fetchQuery with no options", function() {
  expect(3);

  firebase.child("people").set({
    "a": {name: "Bob"},
    "b": {name: "Tom"},
    "c": {name: "Dick"},
    "d": {name: "Harry"},
  });
  firebase.flush();

  store.fetchQuery("person").then(function(collection) {
    ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    equal(get(collection, "length"), 4);
  });
  firebase.flush();
});


test("fetchQuery with options", function() {
  expect(5);

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
  firebase.flush();

  var query = {
    startAt: 2,
    endAt:   3
  };

  store.fetchQuery("person", query).then(function(collection) {
    ok(collection instanceof ObjectCollection, "resolves with an ObjectCollection");
    ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
    equal(collection.get("length"), 2);
    equal(collection.objectAt(0).get("id"), "b");
    equal(collection.objectAt(1).get("id"), "c");
  });
  firebase.flush();
});
