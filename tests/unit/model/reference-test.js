import Ember from 'ember';

import Store from 'fireplace/store';
import Model from 'fireplace/model/model';

var get = Ember.get;

var store;
module("Store - buildFirebaseReference");

test("firebaseRoot can be a String", function() {
  store = Store.create({firebaseRoot: "https://foobar.firebaseio.com"});

  var ref = store.buildFirebaseRootReference();
  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), "https://foobar.firebaseio.com", "reference should point to the right place");
});

test("firebaseRoot can be a Firebase object", function() {
  store = Store.create({firebaseRoot: new Firebase("https://foobar.firebaseio.com/some/path")});

  var ref = store.buildFirebaseRootReference();
  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), "https://foobar.firebaseio.com/some/path", "reference should point to the right place");
});

var rootRef = "https://foobar.firebaseio.com";
var Person;

module("Model - class buildFirebaseReference", {
  setup: function() {
    store = Store.create({
      firebaseRoot: rootRef
    });

    Person = Model.extend({store: store});
    Person.typeKey = "Person";
  }
});

test("defaults to lowercase, underscored & pluralized class name", function(){
  var ref = Person.buildFirebaseReference(store);

  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/people", "reference should be lowercased, underscored and pluralized");

  // people only tests lowercase & plural, lets test underscored

  var SomeThing = Model.extend();
  SomeThing.typeKey = "SomeThing";

  ref = SomeThing.buildFirebaseReference(store);
  equal(ref.toString(), rootRef + "/some_things", "reference should be lowercased, underscored and pluralized");
});

test("uses firebasePath as a string", function(){
  Person.reopenClass({
    firebasePath: "persons"
  });

  var ref = Person.buildFirebaseReference(store);
  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/persons", "reference should point to the right place");
});

test("expands firebasePath string if it contains {{paths}}", function(){
  Person.reopenClass({
    firebasePath: "accounts/{{account.name}}/projects/{{project.id}}/members"
  });

  var account = {name: "foo"},
      project = {id: "bar"},
      ref = Person.buildFirebaseReference(store, {account: account, project: project});

  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/accounts/foo/projects/bar/members", "reference should have been expanded");
});

test("uses firebasePath as a function", function(){
  expect(4);

  var refOptions = {name: "bar"};

  Person.reopenClass({
    firebasePath: function(opts) {
      equal(get(opts, "name"), "bar", "passes the options from buildFirebaseReference through to firebasePath");
      ok(opts instanceof Ember.Object, "turns plain options hash to Ember.Object so we can use opts.get etc...");
      return "foo/"+opts.get("name");
    }
  });

  var ref = Person.buildFirebaseReference(store, refOptions);
  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/foo/bar", "reference should point to the right place");
});

test("expands the result of firebasePath function", function() {
  var refOptions = {id: "bar"};

  Person.reopenClass({
    firebasePath: function() {
      return "foo/{{id}}";
    }
  });

  var ref = Person.buildFirebaseReference(store, refOptions);
  equal(ref.toString(), rootRef + "/foo/bar", "path should have been expanded");
});

test("firebasePath can return a reference", function() {
  Person.reopenClass({
    firebasePath: function(opts) {
      // normally so you can do opts.get("something").buildFirebaseReference().parent().child("/foo")
      // to build up the hierarchy with firebase objects
      return new Firebase("https://somewhere.firebaseio.com/foo/bar/baz");
    }
  });

  var ref = Person.buildFirebaseReference(store);
  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), "https://somewhere.firebaseio.com/foo/bar/baz", "reference should point to the right place");
});

module("Model - instance buildFirebaseReference", {
  setup: function() {
    store = Store.create({
      firebaseRoot: rootRef
    });

    Person = Model.extend({store: store});
    Person.typeKey = "Person";
  }
});

test("defaults to pluralized class name with ID", function(){
  var person = Person.create({id: "123"}),
      ref    = person.buildFirebaseReference();

  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/people/123", "reference should point to the right place");
});

test("uses class reference with ID appended", function() {
  Person.reopenClass({
    firebasePath: "persons"
  });

  var person = Person.create({id: "123"}),
      ref = person.buildFirebaseReference();

  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/persons/123", "reference should point to the right place");
});

test("passes itself to class.buildFirebaseReference", function(){
  Person.reopenClass({
    firebasePath: function(opts) {
      return "persons/"+opts.get("foo");
    }
  });

  var person = Person.create({id: "123", foo: "bar"}),
      ref = person.buildFirebaseReference();

  ok(ref instanceof Firebase, "reference should be instance of Firebase");
  equal(ref.toString(), rootRef + "/persons/bar/123", "reference should point to the right place");
});