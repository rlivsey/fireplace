(function(){
  var get = Ember.get,
      set = Ember.set;

  var store, container, App;

  module("FP.Store", {
    setup: function() {
      container = new Ember.Container();

      store = FP.Store.create({
        container: container
      });

      App = Ember.Namespace.create({name: "App"});
      App.Person = FP.Model.extend({
        name: FP.attr()
      });

      container.register("model:person", App.Person);
      container.register("collection:object", FP.ObjectCollection);
    }
  });

  test("fork creates a new instance of the store with an empty cache", function() {
    var MainStore = FP.Store.extend({
      firebaseRoot: "https://something.firebaseio.com"
    });

    var main = MainStore.create({container: container});
    main.createRecord(App.Person, {name: "Bob"});

    ok(main.all(App.Person).length, "store has cached a record");

    var forked = main.fork();

    equal(get(main, "firebaseRoot"), get(forked, "firebaseRoot"), "fork has the same root");
    ok(!forked.all(App.Person).length, "fork has no cached records");
  });

  test("createRecord creates an instance of of the type", function() {
    var person = store.createRecord("person", {name: "Bob"});

    ok(person instanceof App.Person, "creates the right type");

    equal(get(person, "name"),      "Bob",     "initializes with the attributes");
    equal(get(person, "store"),     store,     "sets the store");
    equal(get(person, "container"), container, "sets the container");
  });

  test("saveRecord when successful", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob"});

    stubReference(person, {
      set: function(json, callback) {
        callback();
      }
    });

    Ember.run(function() {
      store.saveRecord(person).then(function(obj){
        equal(person, obj, "resolves with the object");
      });
    });

    ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
  });

  test("saveRecord when fails", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob"}),
        error  = "AN ERROR";

    stubReference(person, {
      set: function(json, callback) {
        callback(error);
      }
    });

    Ember.run(function() {
      store.saveRecord(person).catch(function(e){
        equal(error, e, "fails with the error");
      });
    });

    ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
  });

  test("saveRecord with full record", function() {
    expect(1);

    var person = store.createRecord("person", {name: "Bob"});

    stubReference(person, {
      set: function(json, callback) {
        ok(true, "called set with JSON");
        callback();
      }
    });

    Ember.run(function() {
      store.saveRecord(person);
    });
  });

  test("saveRecord with full record with priority", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob", priority: 123});
    stubReference(person, {
      setWithPriority: function(json, priority, callback) {
        ok(true, "called setWithPriority");
        equal(priority, 123);
        callback();
      }
    });

    Ember.run(function() {
      store.saveRecord(person);
    });
  });

  test("saveRecord with specific key", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob"});
    stubReference(person, {
      child: function(name) {
        return {
          set: function(value, callback) {
            ok(true, "called set on child with value");
            equal(value, "Bob");
            callback();
          }
        };
      }
    });

    Ember.run(function() {
      store.saveRecord(person, "name");
    });
  });

  test("saveRecord with specific key which is null", function() {
    expect(1);

    var person = store.createRecord("person", {name: null});

    stubReference(person, {
      child: function(name) {
        return {
          remove: function(callback) {
            ok(true, "called remove on chuild");
            callback();
          }
        };
      }
    });

    Ember.run(function() {
      store.saveRecord(person, "name");
    });
  });

  test("saveRecord with priority key", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob", priority: 123});
    stubReference(person, {
      setPriority: function(priority, callback) {
        ok(true, "called setPriority");
        equal(priority, 123);
        callback();
      }
    });

    Ember.run(function() {
      store.saveRecord(person, "priority");
    });
  });

  test("deleteRecord when successful", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob"});
    stubReference(person, {
      remove: function(callback) {
        callback();
      }
    });

    Ember.run(function() {
      person.listenToFirebase();
      store.deleteRecord(person).then(function(obj){
        equal(person, obj, "resolves with the object");
      });
    });

    ok(!get(person, "isListeningToFirebase"), "should have stopped listening for firebase updates");
  });

  test("deleteRecord when fails", function() {
    expect(2);

    var person = store.createRecord("person", {name: "Bob"}),
        error  = "AN ERROR";

    stubReference(person, {
      remove: function(callback) {
        callback(error);
      }
    });

    Ember.run(function() {
      store.deleteRecord(person).catch(function(e){
        equal(error, e, "fails with the error");
      });
    });

    ok(!get(person, "isListeningToFirebase"), "should not have started listening for firebase updates");
  });


  test("fetchOne successfully", function() {
    expect(3);

    var snapshot = mockSnapshot({val: {name: "Bob"}});

    store.buildRecord = function(type) {
      var p = App.Person.create({store: store});
      stubReference(p, {
        once: function(type, success) {
          equal(type, "value", "called once with value on the reference");
          success(snapshot);
        }
      });
      return p;
    };

    Ember.run(function(){
      store.fetchOne("person", 123).then(function(person) {
        ok(true, "found the person");
        ok(get(person, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });

  test("fetchOne from cache", function() {
    expect(3);

    // set isNew to false as new items are hidden in the cache
    var person = store.createRecord(App.Person, {id: 123, isNew: false});

    // this would have happened automatically if we'd done it via the store
    // store.createRecord("person"), {id: 123}
    // but lets be explicit for now...
    store.storeInCache("person", person);

    Ember.run(function(){
      store.fetchOne("person", 123).then(function(record) {
        ok(true, "found the person");
        equal(record, person, "should be the same person");
        ok(get(record, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });

  test("fetchOne which doesn't exist", function() {
    expect(2);

    var snapshot = mockSnapshot();

    store.buildRecord = function(type) {
      var p = App.Person.create();
      stubReference(p, {
        once: function(type, success) {
          equal(type, "value", "called once with value on the reference");
          success(snapshot);
        }
      });
      return p;
    };

    Ember.run(function(){
      store.fetchOne("person", 123).catch(function(error) {
        equal(error, "not found");
      });
    });
  });

  test("fetchOne without permission", function() {
    expect(2);

    var snapshot = mockSnapshot();

    store.buildRecord = function(type) {
      var p = App.Person.create();
      stubReference(p, {
        once: function(type, success, failure) {
          equal(type, "value", "called once with value on the reference");
          failure(snapshot);
        }
      });
      return p;
    };

    Ember.run(function(){
      store.fetchOne("person", 123).catch(function(error) {
        equal(error, "permission denied");
      });
    });
  });



  test("fetchAll successfully", function() {
    expect(3);

    var snapshot = mockSnapshot({val: {
      // ... value isn't used right now
    }});

    stubReference(App.Person, {
      once: function(type, success) {
        equal(type, "value", "called once with value on the reference");
        success(snapshot);
      }
    });

    Ember.run(function(){
      store.fetchAll(App.Person).then(function(collection) {
        ok(collection instanceof FP.ObjectCollection, "resolves with an ObjectCollection");
        ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });

  test("fetchAll which doesn't exist still creates a collection", function() {
    expect(3);

    var snapshot = mockSnapshot();

    stubReference(App.Person, {
      once: function(type, success) {
        equal(type, "value", "called once with value on the reference");
        success(snapshot);
      }
    });

    Ember.run(function(){
      store.fetchAll(App.Person).then(function(collection) {
        ok(collection instanceof FP.ObjectCollection, "resolves with an ObjectCollection");
        ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });

  test("fetchAll without permission", function() {
    expect(2);

    var snapshot = mockSnapshot();
    stubReference(App.Person, {
      once: function(type, success, failure) {
        equal(type, "value", "called once with value on the reference");
        failure(snapshot);
      }
    });

    Ember.run(function(){
      store.fetchAll(App.Person).catch(function(error) {
        equal(error, "permission denied");
      });
    });
  });



  test("fetchQuery with no options", function() {
    expect(3);

    var snapshot = mockSnapshot({val: {
      // ... value isn't used right now
    }});

    stubReference(App.Person, {
      once: function(type, success) {
        equal(type, "value", "called once with value on the reference");
        success(snapshot);
      }
    });

    Ember.run(function(){
      store.fetchQuery(App.Person).then(function(collection) {
        ok(collection instanceof FP.ObjectCollection, "resolves with an ObjectCollection");
        ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });


  test("fetchQuery with options", function() {
    // would be 6, but buildFirebaseQuery is called twice so 2x startAt/endAt/limit
    expect(9);

    var snapshot = mockSnapshot({val: {
      // ... value isn't used right now
    }});

    var query = {
      startAt: 123,
      endAt:   456,
      limit:   100
    };

    stubReference(App.Person, {
      once: function(type, success) {
        equal(type, "value", "called once with value on the reference");
        success(snapshot);
      },
      startAt: function(val) {
        equal(val, 123, "start at called with correct value");
        return this;
      },
      endAt: function(val) {
        equal(val, 456, "end at called with correct value");
        return this;
      },
      limit: function(val) {
        equal(val, 100, "limit called with correct value");
        return this;
      }
    });

    Ember.run(function(){
      store.fetchQuery(App.Person, query).then(function(collection) {
        ok(collection instanceof FP.ObjectCollection, "resolves with an ObjectCollection");
        ok(get(collection, "isListeningToFirebase"), "should have started listening for firebase updates");
      });
    });
  });
})();