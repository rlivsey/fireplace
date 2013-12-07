(function(){

  var get = Ember.get,
      set = Ember.set,
      attr = FP.attr;

  var Person;
  module("Model Firebase events", {
    setup: function() {
      Person = FP.Model.extend({
        firstName: attr(),
        lastName:  attr()
      });
    }
  });

  test("onFirebaseChildAdded sets an attribute", function() {
    var person   = Person.create();
    var snapshot = mockSnapshot({name: "first_name", val: "John"});

    // to make sure it's notified of changes
    equal(get(person, "firstName"), undefined, "should not yet be set");

    Ember.run(function() {
      person.onFirebaseChildAdded(snapshot);
    });

    equal(get(person, "firstName"), "John", "sets the attribute");
  });

  test("onFirebaseChildRemoved clears an attribute", function() {
    var person   = Person.create({firstName: "Bobby"});
    var snapshot = mockSnapshot({name: "first_name"});

    Ember.run(function() {
      person.onFirebaseChildRemoved(snapshot);
    });

    equal(get(person, "firstName"), null, "clears the attribute");
  });

  test("onFirebaseChildChanged updates an attribute", function() {
    var person   = Person.create({firstName: "Bobby"});
    var snapshot = mockSnapshot({name: "first_name", val: "Johnny"});

    Ember.run(function() {
      person.onFirebaseChildChanged(snapshot);
    });

    equal(get(person, "firstName"), "Johnny", "updates the attribute");
  });

  test("onFirebaseValue destroys the object if snapshot value is null", function() {
    var person   = Person.create({store: FP.Store.create()});
    var snapshot = mockSnapshot({val: null});

    ok(!person.isDestroyed, "is not destroyed");

    Ember.run(function() {
      person.onFirebaseValue(snapshot);
    });

    ok(person.isDestroyed, "is now destroyed");
  });

})();