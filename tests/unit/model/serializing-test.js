import Ember from 'ember';

import attr  from 'fireplace/model/attr';
import one   from 'fireplace/relationships/has-one';
import many  from 'fireplace/relationships/has-many';
import Store from 'fireplace/store';
import Model from 'fireplace/model/model';

import ObjectCollection  from 'fireplace/collections/object';
import IndexedCollection from 'fireplace/collections/indexed';
import Transform         from 'fireplace/transforms/base';

var container, store;

module("Model#toFirebaseJSON", {
  setup: function() {
    container = new Ember.Container();
    store = Store.create();
  }
});

function serializesTo(obj, json, message) {
  deepEqual(obj.toFirebaseJSON(), json, message || "should serialize to the expected JSON");
}

function serializesWithPriorityTo(obj, json, message) {
  deepEqual(obj.toFirebaseJSON(true), json, message || "should serialize to the expected JSON");
}


test("serializes attributes", function() {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr()
  });

  var person = Person.create({
    firstName: "Bob",
    lastName: "Johnson"
  });

  serializesTo(person, {
    first_name: "Bob",
    last_name: "Johnson"
  });
});

test("allows overriding key names", function() {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr({key: "surname"})
  });

  var person = Person.create({
    firstName: "Bob",
    lastName: "Johnson"
  });

  serializesTo(person, {
    first_name: "Bob",
    surname: "Johnson"
  });
});

test("transforms attribute values with named serializer", function() {
  expect(2);

  var Person = Model.extend({
    name: attr("capitals")
  });

  container.register("transform:capitals", Transform.extend({
    deserialize: function(value) { return value; },
    serialize: function(value) {
      ok(true, "serialize called");
      return value.toUpperCase();
    },
  }));

  var person = Person.create({
    container: container,
    name: "Bob Johnson"
  });

  serializesTo(person, {
    name: "BOB JOHNSON"
  });
});

test("transforms attribute values with inline serializer", function() {
  expect(2);

  var Person = Model.extend({
    name: attr({serialize: function(value) {
      ok(true, "serialize called");
      return value.toUpperCase();
    }})
  });

  var person = Person.create({
    container: container,
    name: "Bob Johnson"
  });

  serializesTo(person, {
    name: "BOB JOHNSON"
  });
});


test("excludes null values", function() {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr()
  });

  var person = Person.create({
    firstName: "Bob"
  });

  serializesTo(person, {
    first_name: "Bob"
  });
});

test("uses priority/value export format if specified", function() {
  var Person = Model.extend({
    name: attr()
  });

  var person = Person.create({
    priority: 123,
    name: "Bob"
  });

  serializesWithPriorityTo(person, {
    ".priority": 123,
    ".value": {
      name: "Bob"
    }
  });
});

test("doesn't use priority/value export format if specified but no priority is set", function() {
  var Person = Model.extend({
    name: attr()
  });

  var person = Person.create({
    name: "Bob"
  });

  serializesWithPriorityTo(person, {
    name: "Bob"
  });
});

test("serializes hasOne embedded relationships", function() {
  var Avatar = Model.extend({
    image: attr()
  });

  var Person = Model.extend({
    name: attr(),
    avatar: one(Avatar)
  });

  var person = Person.create({
    id: 123,
    name: "Ted Thompson",
    avatar: Avatar.create({
      image: "my-face.png"
    })
  });

  serializesTo(person, {
    name: "Ted Thompson",
    avatar: {
      image: "my-face.png"
    }
  });
});

test("serializes hasOne non-embedded relationships", function() {
  var Avatar = Model.extend({
    image: attr()
  });

  var Person = Model.extend({
    name: attr(),
    avatar: one(Avatar, {embedded: false})
  });

  var person = Person.create({
    id: 123,
    name: "Ted Thompson",
    avatar: Avatar.create({
      id: 234,
      image: "my-face.png"
    })
  });

  serializesTo(person, {
    name: "Ted Thompson",
    avatar: 234
  });
});

test("serializes hasMany embedded relationships", function() {
  container.register("collection:object", ObjectCollection);

  var Address = Model.extend({
    street: attr()
  });

  var Person = Model.extend({
    name: attr(),
    addresses: many(Address)
  });

  var person = Person.create({
    container: container,
    store: store,
    name: "Eric Wimp",
    addresses: [
      Address.create({street: "29 Acacia Road", id: "home"})
    ]
  });

  serializesTo(person, {
    name: "Eric Wimp",
    addresses: {
      home: {
        street: "29 Acacia Road"
      }
    }
  });
});

test("serializes hasMany non-embedded relationships", function() {
  container.register("collection:indexed", IndexedCollection);

  var Address = Model.extend({
    street: attr()
  });

  var Person = Model.extend({
    name: attr(),
    addresses: many(Address, {embedded: false})
  });

  var person = Person.create({
    container: container,
    store: store,
    name: "Eric Wimp",
    addresses: [
      Address.create({id: 234, street: "29 Acacia Road"})
    ]
  });

  serializesTo(person, {
    name: "Eric Wimp",
    addresses: {
      234: true
    }
  });
});