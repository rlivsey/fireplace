(function(){
  var get = Ember.get,
      set = Ember.set,
      attr = FP.attr;

  var Person;
  module("Model lifecycle properties", {
    setup: function() {
      Person = FP.Model.extend({
        firstName: attr(),
        lastName:  attr()
      });
    }
  });

  test("isNew is true if the model has no snapshot", function() {
    var person = Person.create();

    ok(get(person, 'isNew'), "person is new");
    set(person, "snapshot", mockSnapshot({val: {first_name: "Bob", last_name: "Johnson"}}));
    ok(!get(person, 'isNew'), "person is not new");
  });

  module("Model ID", {
    setup: function() {
      Person = FP.Model.extend({
        name: attr()
      });
      Person.store = FP.Store.create();
    }
  });

  test("has a default ID generated by Firebase", function() {
    expect(2);

    var oldPush = Firebase.prototype.push;
    var person = Person.create({store: FP.Store.create()});

    Firebase.prototype.push = function() {
      ok(true, "push called on a firebase reference");
      return {
        name: function() { return "generated id"; }
      };
    };

    var id = get(person, "id");
    Firebase.prototype.push = oldPush;

    equal(id, "generated id", "ID should have been generated");
  });

  module("Model store helpers", {
    setup: function() {
      Person = FP.Model.extend({
        name: attr()
      });
    }
  });

  test("Model#save proxies through to the store", function() {
    expect(3);

    var person;
    var store = {
      saveRecord: function(object, key) {
        ok(true, "called store#saveRecord");
        equal(object, person, "passes object through to the store");
        equal(key, "name", "passes key through to the store");
      }
    };

    person = Person.create({store: store});
    person.save("name");
  });

  test("Model#update sets the value and saves", function() {
    expect(4);

    var person;
    var store = {
      saveRecord: function(object, key) {
        ok(true, "called store#saveRecord");
        equal(object, person, "passes object through to the store");
        equal(key, "name", "passes key through to the store");
      }
    };

    person = Person.create({store: store});
    person.update("name", "Bobby");
    equal(get(person, "name"), "Bobby", "has updated the name");
  });

  test("Model#delete proxies through to the store", function() {
    expect(2);

    var person;
    var store = {
      deleteRecord: function(object) {
        ok(true, "called store#deleteRecord");
        equal(object, person, "passes object through to the store");
      }
    };

    person = Person.create({store: store});
    person.delete();
  });

})();