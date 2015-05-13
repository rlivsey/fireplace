import Ember from 'ember';

import {module, test} from 'qunit';

import Store from 'fireplace/store';
import Model from 'fireplace/model/model';

var get = Ember.get;

var Firebase = window.Firebase;

var store;
module("Store - buildFirebaseReference");

test("firebaseRoot can be a String", function(assert) {
  store = Store.create({firebaseRoot: "https://foobar.firebaseio.com"});

  var ref = store.buildFirebaseRootReference();
  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), "https://foobar.firebaseio.com", "reference should point to the right place");
});

test("firebaseRoot can be a Firebase object", function(assert) {
  store = Store.create({firebaseRoot: new Firebase("https://foobar.firebaseio.com/some/path")});

  var ref = store.buildFirebaseRootReference();
  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), "https://foobar.firebaseio.com/some/path", "reference should point to the right place");
});

var rootRef = "https://foobar.firebaseio.com";
var Person;

module("Model - class buildFirebaseReference", {
  beforeEach() {
    store = Store.create({
      firebaseRoot: rootRef
    });

    Person = Model.extend({store: store});
    Person.typeKey = "Person";
  }
});

test("defaults to lowercase, underscored & pluralized class name", function(assert) {
  var ref = Person.buildFirebaseReference(store);

  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/people", "reference should be lowercased, underscored and pluralized");

  // people only tests lowercase & plural, lets test underscored

  var SomeThing = Model.extend();
  SomeThing.typeKey = "SomeThing";

  ref = SomeThing.buildFirebaseReference(store);
  assert.equal(ref.toString(), rootRef + "/some_things", "reference should be lowercased, underscored and pluralized");
});

test("uses firebasePath as a string", function(assert) {
  Person.reopenClass({
    firebasePath: "persons"
  });

  var ref = Person.buildFirebaseReference(store);
  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/persons", "reference should point to the right place");
});

test("expands firebasePath string if it contains {{paths}}", function(assert) {
  Person.reopenClass({
    firebasePath: "accounts/{{account.name}}/projects/{{project.id}}/members"
  });

  var account = {name: "foo"},
      project = {id: "bar"},
      ref = Person.buildFirebaseReference(store, {account: account, project: project});

  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/accounts/foo/projects/bar/members", "reference should have been expanded");
});

test("uses firebasePath as a function", function(assert) {
  assert.expect(4);

  var refOptions = {name: "bar"};

  Person.reopenClass({
    firebasePath(opts) {
      assert.equal(get(opts, "name"), "bar", "passes the options from buildFirebaseReference through to firebasePath");
      assert.ok(opts instanceof Ember.Object, "turns plain options hash to Ember.Object so we can use opts.get etc...");
      return "foo/"+opts.get("name");
    }
  });

  var ref = Person.buildFirebaseReference(store, refOptions);
  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/foo/bar", "reference should point to the right place");
});

test("expands the result of firebasePath function", function(assert) {
  var refOptions = {id: "bar"};

  Person.reopenClass({
    firebasePath() {
      return "foo/{{id}}";
    }
  });

  var ref = Person.buildFirebaseReference(store, refOptions);
  assert.equal(ref.toString(), rootRef + "/foo/bar", "path should have been expanded");
});

test("overriding firebasePathOptions", function(assert) {
  var refOptions = {id: "bar"};

  Person.reopenClass({
    firebasePath: "people/{{type}}/{{id}}",
    firebasePathOptions(opts) {
      opts.type = "foo";
      return opts;
    }
  });

  var ref = Person.buildFirebaseReference(store, refOptions);
  assert.equal(ref.toString(), rootRef + "/people/foo/bar", "path should have been expanded");
});

test("firebasePath can return a reference", function(assert) {
  Person.reopenClass({
    firebasePath(opts) {
      // normally so you can do opts.get("something").buildFirebaseReference().parent().child("/foo")
      // to build up the hierarchy with firebase objects
      return new Firebase("https://somewhere.firebaseio.com/foo/bar/baz");
    }
  });

  var ref = Person.buildFirebaseReference(store);
  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), "https://somewhere.firebaseio.com/foo/bar/baz", "reference should point to the right place");
});

module("Model - instance buildFirebaseReference", {
  beforeEach() {
    store = Store.create({
      firebaseRoot: rootRef
    });

    Person = Model.extend({store: store});
    Person.typeKey = "Person";
  }
});

test("defaults to pluralized class name with ID", function(assert) {
  var person = Person.create({id: "123"}),
      ref    = person.buildFirebaseReference();

  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/people/123", "reference should point to the right place");
});

test("uses class reference with ID appended", function(assert) {
  Person.reopenClass({
    firebasePath: "persons"
  });

  var person = Person.create({id: "123"}),
      ref = person.buildFirebaseReference();

  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/persons/123", "reference should point to the right place");
});

test("passes itself to class.buildFirebaseReference", function(assert) {
  Person.reopenClass({
    firebasePath(opts) {
      return "persons/"+opts.get("foo");
    }
  });

  var person = Person.create({id: "123", foo: "bar"}),
      ref = person.buildFirebaseReference();

  assert.ok(ref instanceof Firebase, "reference should be instance of Firebase");
  assert.equal(ref.toString(), rootRef + "/persons/bar/123", "reference should point to the right place");
});