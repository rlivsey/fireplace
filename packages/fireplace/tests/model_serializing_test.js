(function(){

  var attr = FP.attr, one = FP.hasOne, many = FP.hasMany;

  var container, store;

  module("Model#toFirebaseJSON", {
    setup: function() {
      container = new Ember.Container();
      store = FP.Store.create();
    }
  });

  function serializesTo(obj, json, message) {
    deepEqual(obj.toFirebaseJSON(), json, message || "should serialize to the expected JSON");
  }

  function serializesWithPriorityTo(obj, json, message) {
    deepEqual(obj.toFirebaseJSON(true), json, message || "should serialize to the expected JSON");
  }

  test("serializes attributes", function() {
    var Person = FP.Model.extend({
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
    var Person = FP.Model.extend({
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

    var Person = FP.Model.extend({
      name: attr("capitals")
    });

    container.register("transform:capitals", FP.Transform.extend({
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

    var Person = FP.Model.extend({
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
    var Person = FP.Model.extend({
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
    var Person = FP.Model.extend({
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
    var Person = FP.Model.extend({
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
    var Avatar = FP.Model.extend({
      image: attr()
    });

    var Person = FP.Model.extend({
      id:   123,
      name: attr(),
      avatar: one(Avatar)
    });

    var person = Person.create({
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

  test("serializes hasMany embedded relationships", function() {
    container.register("collection:object", FP.ObjectCollection);

    var Address = FP.Model.extend({
      street: attr()
    });

    var Person = FP.Model.extend({
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

})();