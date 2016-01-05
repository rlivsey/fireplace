import { moduleFor, test } from 'ember-qunit';

import {
  Model, hasOne, attr
} from 'fireplace';

let firebase;

moduleFor("service:store", "Relationships - hasOne - embedded with ID", {
  subject(options, factory) {
    firebase  = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    return factory.create({
      firebaseRoot: firebase
    });
  },

  beforeEach() {
    const Address = Model.extend({
      street: attr(),
      city:   attr()
    });

    const Person = Model.extend({
      name:    attr(),
      address: hasOne({id: true})
    });

    this.register("model:person", Person);
    this.register("model:address", Address);
  }
});

// Duplicates model/serializing test
test("includes the ID in the firebase data", function(assert) {
  assert.expect(1);
  const done = assert.async();

  const store = this.subject();

  const address = store.createRecord("address", {
    id:     "address-1",
    street: "25 Foo Street",
    city:   "Barsville"
  });

  let person;
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
  const done = assert.async();

  const store = this.subject();

  firebase.child("people/person-1").set({
    name: "Bob Johnson",
    address: {
      id:     "an-address",
      street: "25 Foo Street",
      city:   "Barsville"
    }
  }, function() {
    store.findOne("person", "person-1").then(function(person) {
      const address = person.get("address");
      assert.equal(address.get("id"), "an-address");
    }).finally(function() {
      done();
    });
  });
});