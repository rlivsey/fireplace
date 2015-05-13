import Ember from 'ember';

import {module, test} from 'qunit';

import {
  Store, Model, hasOne, attr
} from 'fireplace';

var container, firebase, store;

module("Relationships - hasOne - embedded with ID", {
  beforeEach: function() {
    container = new Ember.Container();
    firebase  = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    store = Store.create({
      container: container,
      firebaseRoot: firebase
    });

    var Address = Model.extend({
      street: attr(),
      city:   attr()
    });

    var Person = Model.extend({
      name:    attr(),
      address: hasOne({id: true})
    });

    container.register("model:person", Person);
    container.register("model:address", Address);
  }
});

// Duplicates model/serializing test
test("includes the ID in the firebase data", function(assert) {
  assert.expect(1);
  var done = assert.async();

  var address = store.createRecord("address", {
    id:     "address-1",
    street: "25 Foo Street",
    city:   "Barsville"
  });

  var person;
  address.save().then(function() {
    person = store.createRecord("person", {
      id:   "person-1",
      name: "Bob Johnson",
      address: address
    });
    return person.save();
  }).then(function() {
    firebase.child("people/person-1").once("value", function(snap) {
      assert.deepEqual(snap.val(), {
        name: "Bob Johnson",
        address: {
          id:     "address-1",
          street: "25 Foo Street",
          city:   "Barsville"
        }
      });
      done();
    });
  });
});

test("includes the ID when re-hydrating the models", function(assert) {
  assert.expect(1);
  var done = assert.async();

  firebase.child("people/person-1").set({
    name: "Bob Johnson",
    address: {
      id:     "an-address",
      street: "25 Foo Street",
      city:   "Barsville"
    }
  }, function() {
    store.findOne("person", "person-1").then(function(person) {
      var address = person.get("address");
      assert.equal(address.get("id"), "an-address");
    }).finally(function() {
      done();
    });
  });
});