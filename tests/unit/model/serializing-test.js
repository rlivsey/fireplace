import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

import attr      from 'fireplace/model/attr';
import one       from 'fireplace/relationships/has-one';
import many      from 'fireplace/relationships/has-many';
import Model     from 'fireplace/model/model';
import Transform from 'fireplace/transforms/base';

moduleFor("service:store", "Model#toFirebaseJSON", {
  needs: [
    "collection:object",
    "collection:indexed"
  ],
  subject(options, factory) {
    const firebase  = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    return factory.create({
      firebaseRoot: firebase
    });
  }
});

window.QUnit.assert.serializesTo = function(obj, json, message) {
  this.deepEqual(obj.toFirebaseJSON(), json, message || "should serialize to the expected JSON");
};

window.QUnit.assert.serializesWithPriorityTo = function(obj, json, message) {
  this.deepEqual(obj.toFirebaseJSON(true), json, message || "should serialize to the expected JSON");
};


test("serializes attributes", function(assert) {
  this.register("model:person", Model.extend({
    firstName: attr(),
    lastName:  attr()
  }));

  const person = this.subject().createRecord("person", {
    firstName: "Bob",
    lastName: "Johnson"
  });

  assert.serializesTo(person, {
    first_name: "Bob",
    last_name: "Johnson"
  });
});

test("allows overriding key names", function(assert) {
  this.register("model:person", Model.extend({
    firstName: attr(),
    lastName:  attr({key: "surname"})
  }));

  const person = this.subject().createRecord("person", {
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

  this.register("transform:capitals", Transform.extend({
    deserialize(value) { return value; },
    serialize(value) {
      assert.ok(true, "serialize called");
      return value.toUpperCase();
    },
  }));

  this.register("model:person", Model.extend({
    name: attr("capitals")
  }));

  const person = this.subject().createRecord("person", {
    name: "Bob Johnson"
  });

  assert.serializesTo(person, {
    name: "BOB JOHNSON"
  });
});

test("transforms attribute values with inline serializer", function(assert) {
  assert.expect(2);

  this.register("model:person", Model.extend({
    name: attr({serialize(value) {
      assert.ok(true, "serialize called");
      return value.toUpperCase();
    }})
  }));

  const person = this.subject().createRecord("person", {
    name: "Bob Johnson"
  });

  assert.serializesTo(person, {
    name: "BOB JOHNSON"
  });
});


test("excludes null values", function(assert) {
  this.register("model:person", Model.extend({
    firstName: attr(),
    lastName:  attr()
  }));

  const person = this.subject().createRecord("person", {
    firstName: "Bob"
  });

  assert.serializesTo(person, {
    first_name: "Bob"
  });
});

test("uses priority/value export format if specified", function(assert) {
  this.register("model:person", Model.extend({
    name: attr()
  }));

  const person = this.subject().createRecord("person", {
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
  this.register("model:person", Model.extend({
    name: attr()
  }));

  const person = this.subject().createRecord("person", {
    name: "Bob"
  });

  assert.serializesWithPriorityTo(person, {
    name: "Bob"
  });
});

test("serializes hasOne embedded relationships", function(assert) {
  this.register("model:avatar", Model.extend({
    image: attr()
  }));

  this.register("model:person", Model.extend({
    name: attr(),
    avatar: one("avatar")
  }));

  const person = this.subject().createRecord("person", {
    id: "123",
    name: "Ted Thompson",
    avatar: this.subject().createRecord("avatar", {
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
  this.register("model:avatar", Model.extend({
    image: attr()
  }));

  this.register("model:person", Model.extend({
    name: attr(),
    avatar: one("avatar", { id: true })
  }));

  const person = this.subject().createRecord("person", {
    id: "123",
    name: "Ted Thompson",
    avatar: this.subject().createRecord("avatar", {
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
  this.register("model:avatar", Model.extend({
    image: attr()
  }));

  this.register("model:person", Model.extend({
    name: attr(),
    avatar: one("avatar", {embedded: false})
  }));

  const person = this.subject().createRecord("person", {
    id: "123",
    name: "Ted Thompson",
    avatar: this.subject().createRecord("avatar", {
      id: "234",
      image: "my-face.png"
    })
  });

  assert.serializesTo(person, {
    name: "Ted Thompson",
    avatar: "234"
  });
});

test("serializes hasMany embedded relationships", function(assert) {
  this.register("model:address", Model.extend({
    street: attr()
  }));

  this.register("model:person", Model.extend({
    name: attr(),
    addresses: many("address")
  }));

  const person = this.subject().createRecord("person", {
    name: "Eric Wimp",
    addresses: Ember.A([
      this.subject().createRecord("address", {
        id: "home",
        street: "29 Acacia Road"
      })
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

  this.register("model:address", Model.extend({
    street: attr()
  }));

  this.register("model:person", Model.extend({
    name: attr(),
    addresses: many("address", {embedded: false})
  }));

  const person = this.subject().createRecord("person", {
    name: "Eric Wimp",
    addresses: Ember.A([
      this.subject().createRecord("address", {
        id: "home",
        street: "29 Acacia Road"
      })
    ])
  });

  assert.serializesTo(person, {
    name: "Eric Wimp",
    addresses: {
      home: true
    }
  });
});