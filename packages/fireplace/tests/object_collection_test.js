(function(){
  var attr = FP.attr,
      get  = Ember.get;

  var App, container, store;
  var rootRef = "https://foobar.firebaseio.com";

  function setupEnv() {
    App       = Ember.Namespace.create({name: "App"});
    container = new Ember.Container();
    store     = FP.Store.create({
      container:    container,
      firebaseRoot: rootRef
    });

    App.Person = FP.Model.extend({
      name: attr()
    });

    App.People = FP.ObjectCollection.extend({
      model: App.Person
    });
  }

  module("FP.ObjectCollection initializing", {
    setup: function() {
      setupEnv();
    }
  });

  test("inflates from a snapshot if one exists", function() {
    var snap = mockSnapshot({val: {
      123: {name: "Tom", priority: 1},
      234: {name: "Dick", priority: 2},
      456: {name: "Harry", priority: 4}
    }});
    var people = App.People.create({store: store, snapshot: snap});

    equal(get(people, "length"), 3, "added 3 items");

    var person = people.objectAt(0);
    ok(person instanceof App.Person, "has instantiated the models");
    deepEqual(people.mapBy("name"), ["Tom", "Dick", "Harry"], "has assigned the attributes");
    deepEqual(people.mapBy("priority"), [1,2,4], "has assigned the priorities");
  });

  module("FP.ObjectCollection references", {
    setup: function() {
      setupEnv();
    }
  });

  test("generates a reference based on its model", function() {
    var people = App.People.create({store: store});
    var ref = people.buildFirebaseReference();
    equal(ref.toString(), rootRef+"/people", "reference should be based off the model");
  });

  test("Adding an item sets its reference to be a child of the collection", function() {
    var collectionRef = new Firebase(rootRef+"/some/sub/path");

    var people = App.People.create({store: store, firebaseReference: collectionRef});
    var person = store.createRecord(App.Person, {id: "123"});

    people.pushObject(person);

    var ref = person.buildFirebaseReference();
    equal(ref.toString(), rootRef+"/some/sub/path/123", "reference should be based off the model");
  });

  // This is important so you can remove an object and then delete it to persist the change
  // otherwise you'd remove it and if you delete then it'll try and delete the wrong path
  // although in that case you could just delete the object and it'll get removed from the
  // collection anyway...
  test("Removing an item doesn't lose its reference", function() {
    var collectionRef = new Firebase(rootRef+"/some/sub/path");

    var people = App.People.create({store: store, firebaseReference: collectionRef});
    var person = store.createRecord(App.Person, {id: "123"});

    people.pushObject(person);

    people.removeObject(person);

    var ref = person.buildFirebaseReference();
    equal(ref.toString(), rootRef+"/some/sub/path/123", "reference should still be part of the collection");
  });

  module("FP.ObjectCollection serializing", {
    setup: function() {
      setupEnv();
    }
  });

  test("serializes children to Firebase JSON", function() {
    var people = App.People.create({
      content: [
        store.createRecord(App.Person, {id: "123", name: "Tom"}),
        store.createRecord(App.Person, {id: "234", name: "Dick"}),
        store.createRecord(App.Person, {id: "345", name: "Harry"})
      ]
    });

    var json = people.toFirebaseJSON();

    deepEqual(json, {
      123: {
        name: "Tom"
      },
      234: {
        name: "Dick"
      },
      345: {
        name: "Harry"
      }
    });
  });

  test("serializes children to Firebase JSON includes priorities", function() {
    var people = App.People.create({
      content: [
        store.createRecord(App.Person, {id: "123", priority: 1, name: "Tom"}),
        store.createRecord(App.Person, {id: "234", priority: 2, name: "Dick"}),
        store.createRecord(App.Person, {id: "345", priority: 3, name: "Harry"})
      ]
    });

    var json = people.toFirebaseJSON();

    deepEqual(json, {
      123: {
        ".value": { name: "Tom" },
        ".priority": 1
      },
      234: {
        ".value": { name: "Dick" },
        ".priority": 2
      },
      345: {
        ".value": { name: "Harry" },
        ".priority": 3
      }
    });

  });


  var collection;
  module("FP.ObjectCollection receiving updates from Firebase", {
    setup: function() {
      setupEnv();

      var content = [
        store.createRecord(App.Person, {id: "1", name: "Tom"}),
        store.createRecord(App.Person, {id: "2", name: "Dick"}),
        store.createRecord(App.Person, {id: "3", name: "Harry"})
      ];

      collection = FP.ObjectCollection.create({store: store, content: content, model: App.Person});
    }
  });

  test("firebaseChildAdded adds an item", function(){
    var snapshot        = mockSnapshot({name: "New", val: {name: "A New Person"}, priority: 123});
    var emptyCollection = FP.ObjectCollection.create({store: store, content: [], model: App.Person, firebasePath: "persons"});

    Ember.run(function(){
      emptyCollection.onFirebaseChildAdded(snapshot);
    });

    equal(emptyCollection.get("length"), 1, "should have added an item");

    var person  = emptyCollection.objectAt(0);
    ok(person instanceof App.Person, "should be instance of Person");

    var name = get(person, "name");
    equal(name, "A New Person", "should have set the properties");

    var priority = get(person, "priority");
    equal(priority, 123, "should have set the priority");
  });

  test("firebaseChildAdded adds an item to the start when no previous item name specified", function(){
    var snapshot = mockSnapshot({name: "New", val: {name: "A New Person"}});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["New", "1", "2", "3"], "should have inserted at the start");
  });

  test("firebaseChildAdded adds an item to the end if the previous item doesn't exist", function(){
    var snapshot = mockSnapshot({name: "New", val: {name: "A New Person"}});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot, "foo");
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "3", "New"], "should have inserted at the end");
  });

  test("firebaseChildAdded adds an item after the previous item name specified", function(){
    var snapshot = mockSnapshot({name: "New", val: {name: "A New Person"}});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot, "2");
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "New", "3"], "should have inserted after the previous item");
  });

  test("firebaseChildAdded supports polymorphism", function(){

    var PolyCollection = FP.ObjectCollection.extend({
      modelClassFromSnapshot: function(snapshot) {
        return snapshot.val().type;
      }
    });

    var snapshot       = mockSnapshot({name: "New", val: {type: "thing"}});
    var polyCollection = PolyCollection.create({store: store, firebasePath: "things"});

    var Thing = FP.Model.extend();
    container.register("model:thing", Thing);

    Ember.run(function(){
      polyCollection.onFirebaseChildAdded(snapshot);
    });

    var thing = polyCollection.objectAt(0);
    ok(thing instanceof Thing, "should be instance of Thing");
  });


  test("firebaseChildRemoved removes an item if it exists", function(){
    var snapshot = mockSnapshot({name: "2"});

    Ember.run(function(){
      collection.onFirebaseChildRemoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["1", "3"], "should have removed the item");
  });

  test("firebaseChildRemoved doesn't remove an item which doesn't exist", function(){
    var snapshot = mockSnapshot({name: "foo"});

    Ember.run(function(){
      collection.onFirebaseChildRemoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "3"], "should not have removed anything");
  });



  test("firebaseChildMoved updates the item's priority", function(){
    var snapshot = mockSnapshot({name: "2", priority: 42});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    var person     = collection.objectAt(0);
    var priority = get(person, "priority");
    equal(priority, 42, "should have changed the priority");
  });

  test("firebaseChildMoved ignores items which don't exist", function(){
    var snapshot = mockSnapshot({name: "New"});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "3"], "should not have moved anything");
  });

  test("firebaseChildMoved moves an item to the start when no previous item name specified", function(){
    var snapshot = mockSnapshot({name: "2"});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["2", "1", "3"], "should have moved to the start");
  });

  test("firebaseChildMoved moves an item to the end if the previous item doesn't exist", function(){
    var snapshot = mockSnapshot({name: "2"});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot, "foo");
    });

    deepEqual(collection.mapProperty("id"), ["1", "3", "2"], "should have moved to the end");
  });

  test("firebaseChildMoved moves an item after the previous item name specified", function(){
    var snapshot = mockSnapshot({name: "1"});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot, "2");
    });

    deepEqual(collection.mapProperty("id"), ["2", "1", "3"], "should have moved after the previous item");
  });

  test("listening to firebase recurses to its children", function() {
    ok(!get(collection, "isListeningToFirebase"), "collection isn't listening");
    ok(collection.everyBy("isListeningToFirebase", false), "none are listening");

    collection.listenToFirebase();

    ok(get(collection, "isListeningToFirebase"), "collection is listening");
    ok(collection.everyBy("isListeningToFirebase", true), "all are listening");

    collection.stopListeningToFirebase();

    ok(!get(collection, "isListeningToFirebase"), "collection isn't listening");
    ok(collection.everyBy("isListeningToFirebase", false), "none are listening");
  });
})();