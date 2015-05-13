import Ember from 'ember';

import {module, test} from 'qunit';

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
  beforeEach: function() {
    container = new Ember.Container();
    store = Store.create();
  }
});

window.QUnit.assert.serializesTo = function(obj, json, message) {
  this.deepEqual(obj.toFirebaseJSON(), json, message || "should serialize to the expected JSON");
};

window.QUnit.assert.serializesWithPriorityTo = function(obj, json, message) {
  this.deepEqual(obj.toFirebaseJSON(true), json, message || "should serialize to the expected JSON");
};


test("serializes attributes", function(assert) {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr()
  });

  var person = Person.create({
    firstName: "Bob",
    lastName: "Johnson"
  });

  assert.serializesTo(person, {
    first_name: "Bob",
    last_name: "Johnson"
  });
});

test("allows overriding key names", function(assert) {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr({key: "surname"})
  });

  var person = Person.create({
    firstName: "Bob",
    lastName: "Johnson"
  });

  assert.serializesTo(person, {
    first_name: "Bob",
    surname: "Johnson"
  });
});

test("transforms attribute values with named serializer", function(assert) {
  assert.expect(2);

  var Person = Model.extend({
    name: attr("capitals")
  });

  container.register("transform:capitals", Transform.extend({
    deserialize: function(value) { return value; },
    serialize: function(value) {
      assert.ok(true, "serialize called");
      return value.toUpperCase();
    },
  }));

  var person = Person.create({
    container: container,
    name: "Bob Johnson"
  });

  assert.serializesTo(person, {
    name: "BOB JOHNSON"
  });
});

test("transforms attribute values with inline serializer", function(assert) {
  assert.expect(2);

  var Person = Model.extend({
    name: attr({serialize: function(value) {
      assert.ok(true, "serialize called");
      return value.toUpperCase();
    }})
  });

  var person = Person.create({
    container: container,
    name: "Bob Johnson"
  });

  assert.serializesTo(person, {
    name: "BOB JOHNSON"
  });
});


test("excludes null values", function(assert) {
  var Person = Model.extend({
    firstName: attr(),
    lastName:  attr()
  });

  var person = Person.create({
    firstName: "Bob"
  });

  assert.serializesTo(person, {
    first_name: "Bob"
  });
});

test("uses priority/value export format if specified", function(assert) {
  var Person = Model.extend({
    name: attr()
  });

  var person = Person.create({
    priority: 123,
    name: "Bob"
  });

  assert.serializesWithPriorityTo(person, {
    ".priority": 123,
    ".value": {
      name: "Bob"
    }
  });
});

test("doesn't use priority/value export format if specified but no priority is set", function(assert) {
  var Person = Model.extend({
    name: attr()
  });

  var person = Person.create({
    name: "Bob"
  });

  assert.serializesWithPriorityTo(person, {
    name: "Bob"
  });
});

test("serializes hasOne embedded relationships", function(assert) {
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

  assert.serializesTo(person, {
    name: "Ted Thompson",
    avatar: {
      image: "my-face.png"
    }
  });
});

test("serializes hasOne embedded relationships (with ID)", function(assert) {
  var Avatar = Model.extend({
    image: attr()
  });

  var Person = Model.extend({
    name: attr(),
    avatar: one(Avatar, { id: true })
  });

  var person = Person.create({
    id: 123,
    name: "Ted Thompson",
    avatar: Avatar.create({
      id:    "an-avatar",
      image: "my-face.png"
    })
  });

  assert.serializesTo(person, {
    name: "Ted Thompson",
    avatar: {
      id:    "an-avatar",
      image: "my-face.png"
    }
  });
});

test("serializes hasOne non-embedded relationships", function(assert) {
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

  assert.serializesTo(person, {
    name: "Ted Thompson",
    avatar: 234
  });
});

test("serializes hasMany embedded relationships", function(assert) {
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
    addresses: Ember.A([
      Address.create({street: "29 Acacia Road", id: "home"})
    ])
  });

  assert.serializesTo(person, {
    name: "Eric Wimp",
    addresses: {
      home: {
        street: "29 Acacia Road"
      }
    }
  });
});

test("serializes hasMany non-embedded relationships", function(assert) {
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
    addresses: Ember.A([
      Address.create({id: 234, street: "29 Acacia Road"})
    ])
  });

  assert.serializesTo(person, {
    name: "Eric Wimp",
    addresses: {
      234: true
    }
  });
});