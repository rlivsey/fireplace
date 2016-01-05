import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

import Model from 'fireplace/model/model';
import attr  from 'fireplace/model/attr';
import one   from 'fireplace/relationships/has-one';

import { makeSnapshot } from '../../helpers/firebase';

const get = Ember.get;

moduleFor("service:store", "Model Firebase events", {
  subject(options, factory) {
    const firebase = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    return factory.create({
      firebaseRoot: firebase
    });
  },
  beforeEach() {
    this.register("model:person", Model.extend({
      firstName: attr(),
      lastName:  attr(),
      avatar: one({embedded: false})
    }));
  }
});

test("onFirebaseChildAdded sets an attribute", function(assert) {
  const person   = this.subject().createRecord("person");
  const snapshot = makeSnapshot("first_name", "John");

  // to make sure it's notified of changes
  assert.equal(get(person, "firstName"), undefined, "should not yet be set");

  Ember.run(function() {
    person.onFirebaseChildAdded(snapshot);
  });

  assert.equal(get(person, "firstName"), "John", "sets the attribute");
});

test("onFirebaseChildRemoved clears an attribute", function(assert) {
  const person   = this.subject().createRecord("person", {firstName: "Bobby", snapshot: makeSnapshot("123", {first_name: "Bobby"})});

  // child_removed sends the old value with the snapshot, not null
  const snapshot = makeSnapshot("first_name", "Bobby");

  Ember.run(function() {
    person.onFirebaseChildRemoved(snapshot);
  });

  assert.equal(get(person, "firstName"), null, "clears the attribute");
});

test("onFirebaseChildChanged updates an attribute", function(assert) {
  const person   = this.subject().createRecord("person", {firstName: "Bobby"});
  const snapshot = makeSnapshot("first_name", "Johnny");

  Ember.run(function() {
    person.onFirebaseChildChanged(snapshot);
  });

  assert.equal(get(person, "firstName"), "Johnny", "updates the attribute");
});

test("onFirebaseValue destroys the object if snapshot value is null", function(assert) {
  const person   = this.subject().createRecord("person");
  const snapshot = makeSnapshot("123", null);

  assert.ok(!person.isDestroyed, "is not destroyed");

  Ember.run(function() {
    person.onFirebaseValue(snapshot);
  });

  assert.ok(person.isDestroyed, "is now destroyed");
});

// firebase triggers child_added events first, then value
// so we need to be able to handle not having the snapshot yet
test("handles child_added events occurring before value", function(assert) {
  assert.expect(4);

  const person = this.subject().createRecord("person");

  const firstNameSnap = makeSnapshot("first_name", "Ted");
  const lastNameSnap  = makeSnapshot("last_name",  "Johnson");
  const avatarSnap    = makeSnapshot("avatar",     "123");

  const mockAvatar = "an avatar";
  this.subject().findOne = function(type, id/*, query*/) {
    assert.equal(id, "123", "calls find for the avatar with the correct ID");
    return mockAvatar;
  };

  Ember.run(function() {
    person.onFirebaseChildAdded(lastNameSnap);
    person.onFirebaseChildAdded(firstNameSnap);
    person.onFirebaseChildAdded(avatarSnap);
    // ... at some point later person.onFirebaseValue(...) will be called
  });

  assert.equal(get(person, "firstName"), "Ted",      "sets the first name");
  assert.equal(get(person, "lastName"),  "Johnson",  "sets the last name");
  assert.equal(get(person, "avatar"),    mockAvatar, "finds the avatar");
});
