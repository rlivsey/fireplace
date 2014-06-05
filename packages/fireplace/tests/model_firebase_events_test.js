(function(){

  var get = Ember.get,
      set = Ember.set,
      attr = FP.attr,
      one  = FP.hasOne;

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
    var person   = Person.create({firstName: "Bobby", snapshot: mockSnapshot({name: "123", val: {first_name: "Bobby"}})});

    // child_removed sends the old value with the snapshot, not null
    var snapshot = mockSnapshot({name: "first_name", val: "Bobby"});

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

  module("Model Firebase events with relationship", {
    setup: function() {
      Person = FP.Model.extend({
        firstName: attr(),
        lastName:  attr(),
        avatar: one({embedded: false})
      });
    }
  });

  // firebase triggers child_added events first, then value
  // so we need to be able to handle not having the snapshot yet
  test("handles child_added events occurring before value", function() {
    expect(4);

    var store  = FP.Store.create();
    var person = Person.create({store: store});

    var firstNameSnap = mockSnapshot({name: "first_name", val: "Ted"});
    var lastNameSnap  = mockSnapshot({name: "last_name",  val: "Johnson"});
    var avatarSnap    = mockSnapshot({name: "avatar",     val: "123"});

    var mockAvatar = "an avatar";
    store.findOne = function(type, id, query) {
      equal(id, "123", "calls find for the avatar with the correct ID");
      return mockAvatar;
    };

    Ember.run(function() {
      person.onFirebaseChildAdded(lastNameSnap);
      person.onFirebaseChildAdded(firstNameSnap);
      person.onFirebaseChildAdded(avatarSnap);
      // ... at some point later person.onFirebaseValue(...) will be called
    });

    equal(get(person, "firstName"), "Ted",      "sets the first name");
    equal(get(person, "lastName"),  "Johnson",  "sets the last name");
    equal(get(person, "avatar"),    mockAvatar, "finds the avatar");
  });

})();