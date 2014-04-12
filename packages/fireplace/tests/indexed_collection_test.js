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

    App.PeopleIndex = FP.IndexedCollection.extend({
      store: store,
      model: App.Person
    });
  }

  module("FP.IndexedCollection initializing", {
    setup: function() {
      setupEnv();
    }
  });

  test("inflates from a snapshot if one exists", function() {
    var snap = mockSnapshot({val: {
      123: true,
      234: true,
      456: true
    }});

    // stub the find so we don't need to worry about the run-loop etc...
    store.findOne = function(type, id) {
      return App.Person.create({id: id});
    };

    var people = App.PeopleIndex.create({store: store, snapshot: snap});

    equal(get(people, "length"), 3, "added 3 items");

    var person = people.objectAt(0);
    ok(person instanceof App.Person, "has instantiated the models");
    deepEqual(people.mapBy("id"), ["123","234","456"], "has all the items in the right places");
  });

  test("wraps plain objects in meta models if necessary", function() {
    App.Member = FP.MetaModel.extend({
      level: attr()
    });

    var person = store.createRecord(App.Person, {id: 123});
    var people = App.PeopleIndex.create({
      as: App.Member,
      content: [
        person
      ]
    });

    var obj = people.get("firstObject");

    ok(obj instanceof App.Member, "item is wrapped in meta model");
    equal(get(obj, 'content'), person, "meta model has item as content");
  });

  module("FP.IndexedCollection serializing", {
    setup: function() {
      setupEnv();
    }
  });

  test("serializes children as id => true if they are plain models", function() {
    var people = App.PeopleIndex.create({
      content: [
        store.createRecord(App.Person, {id: "123", name: "Tom"}),
        store.createRecord(App.Person, {id: "234", name: "Dick"}),
        store.createRecord(App.Person, {id: "345", name: "Harry"})
      ]
    });

    var json = people.toFirebaseJSON();

    deepEqual(json, {
      123: true,
      234: true,
      345: true
    });
  });

  module("FP.IndexedCollection serializing", {
    setup: function() {
      setupEnv();
    }
  });

  test("serializes children as id => meta model JSON if they are meta models", function() {
    App.Member = FP.MetaModel.extend({
      level: attr()
    });

    var people = App.PeopleIndex.create({
      content: [
        store.createRecord(App.Member, {
          level: "member",
          content: store.createRecord(App.Person, {id: "123", name: "Tom"})
        }),
        store.createRecord(App.Member, {
          level: "admin",
          content: store.createRecord(App.Person, {id: "234", name: "Dick"})
        }),
        store.createRecord(App.Member, {
          level: "member",
          content: store.createRecord(App.Person, {id: "345", name: "Harry"}
        )})
      ]
    });

    var json = people.toFirebaseJSON();

    deepEqual(json, {
      123: {
        level: "member"
      },
      234: {
        level: "admin"
      },
      345: {
        level: "member"
      }
    });
  });

  module("FP.IndexedCollection adding items", {
    setup: function() {
      setupEnv();
    }
  });

  test("sets the parent for meta-models so references are all setup", function() {
    App.Member = FP.MetaModel.extend();

    var people = App.PeopleIndex.create();

    var person = store.createRecord(App.Person, {id: 123});
    var member = store.createRecord(App.Member, {content: person});

    people.pushObject(member);

    equal(member.get("parent"), people, "sets the parent");
  });

  test("doesn't set the parent for non-meta-models", function() {
    App.Member = FP.MetaModel.extend();

    var people = App.PeopleIndex.create();

    var person = store.createRecord(App.Person, {id: 123});
    people.pushObject(person);

    ok(!person.get("parent"), "parent is not set");
  });

  test("wraps objects in their meta models if `as` is set", function() {
    App.Member = FP.MetaModel.extend({
      level: attr()
    });

    var people = App.PeopleIndex.create({as: App.Member});

    var person = store.createRecord(App.Person, {id: 123});
    people.pushObject(person);

    var obj = people.get("firstObject");

    ok(obj instanceof App.Member, "item is wrapped in meta model");
    ok(get(obj, 'content') instanceof App.Person, "content is a person");
    equal(get(obj, 'content'), person, "meta model has item as content");
  });

  test("doesn't double wrap", function() {
    App.Member = FP.MetaModel.extend({
      level: attr()
    });

    var people = App.PeopleIndex.create({as: App.Member});

    var person = store.createRecord(App.Person, {id: 123});
    var member = store.createRecord(App.Member, {content: person});
    people.pushObject(member);

    var obj = people.get("firstObject");

    ok(obj instanceof App.Member, "item is wrapped in meta model");
    equal(get(obj, 'content'), person, "meta model has item as content");
  });

  module("FP.IndexedCollection finding items", {
    setup: function() {
      setupEnv();
    }
  });

  test("with no parameters", function() {
    expect(3);

    var people = App.PeopleIndex.create({
      store: store,
      content: [ // poke in the internal format, should never do this for reals
        {id: "tom"},
        {id: "dick"},
        {id: "harry"}
      ]
    });

    store.findOne = function(type, id, query) {
      equal(type, App.Person, "should find with the collection's model");
      equal(id, "tom", "should look for the item's id");
      ok(!query, "doesn't have any query");
    };

    Ember.run(function() {
      people.objectAt(0);
    });
  });

  test("with query parameters", function() {
    expect(3);

    var people = App.PeopleIndex.create({
      store: store,
      query: {workspace: "123"},
      content: [ // poke in the internal format, should never do this for reals
        {id: "tom"},
        {id: "dick"},
        {id: "harry"}
      ]
    });

    store.findOne = function(type, id, query) {
      equal(type, App.Person, "should find with the collection's model");
      equal(id, "tom", "should look for the item's id");
      deepEqual(query, {workspace: "123"}, "should pass the query data through");
    };

    Ember.run(function() {
      people.objectAt(0);
    });
  });

  module("FP.IndexedCollection references", {
    setup: function() {
      setupEnv();
    }
  });

  test("generates a reference based on its model", function() {
    var people = App.PeopleIndex.create({store: store});
    var ref = people.buildFirebaseReference();
    equal(ref.toString(), rootRef+"/people", "reference should be based off the model");
  });

  test("adding an item doesn't change its reference", function() {
    var collectionRef = new Firebase(rootRef+"/some/sub/path");

    var people = App.PeopleIndex.create({store: store, firebaseReference: collectionRef});
    var person = store.createRecord(App.Person, {id: "123"});

    var wasRef = person.buildFirebaseReference();

    people.pushObject(person);

    var ref = person.buildFirebaseReference();
    equal(ref.toString(), wasRef.toString(), "reference should not have changed");
  });



  var collection;
  module("FP.IndexedCollection receiving updates from Firebase", {
    setup: function() {
      setupEnv();

      var content = [ // poke in the internal format, should never do this for reals
        {id: "1", priority: 10},
        {id: "2", priority: 20},
        {id: "3", priority: 30}
      ];

      // prime the cache otherwise Ember does a find
      store.createRecord(App.Person, {id: "1", name: "Tom"});
      store.createRecord(App.Person, {id: "2", name: "Dick"});
      store.createRecord(App.Person, {id: "3", name: "Harry"});
      store.createRecord(App.Person, {id: "New"});

      collection = FP.IndexedCollection.create({store: store, content: content, model: App.Person});
    }
  });

  test("firebaseChildAdded adds an item", function(){
    var snapshot        = mockSnapshot({name: "New", val: true, priority: 123});
    var emptyCollection = FP.IndexedCollection.create({store: store, content: [], model: App.Person, firebasePath: "persons"});

    Ember.run(function(){
      emptyCollection.onFirebaseChildAdded(snapshot);
    });

    equal(emptyCollection.get("length"), 1, "should have added an item");

    var person  = emptyCollection.objectAt(0);
    // it's an ObjectProxy at this point
    // ok(person instanceof App.Person, "should be instance of Person");
    ok(get(person, "content") instanceof App.Person, "should be instance of Person");

    var id = get(person, "id");
    equal(id, "New", "should have set the ID");

    var priority = get(person, "priority");
    equal(priority, undefined, "should not have set a priority");
  });

  test("firebaseChildAdded adds an item to the start when no previous item name specified", function(){
    var snapshot = mockSnapshot({name: "New", val: true, priority: 1});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["New", "1", "2", "3"], "should have inserted at the start");
  });

  test("firebaseChildAdded adds an item to the end if the previous item doesn't exist", function(){
    var snapshot = mockSnapshot({name: "New", val: true});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot, "foo");
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "3", "New"], "should have inserted at the end");
  });

  test("firebaseChildAdded adds an item after the previous item name specified", function(){
    expect(1);

    var snapshot = mockSnapshot({name: "New", val: true, priority: 25});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot, "2");
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "New", "3"], "should have inserted after the previous item");
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



  test("firebaseChildMoved doesn't change the item's priority", function(){
    var snapshot = mockSnapshot({name: "2", priority: 42});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    var person   = collection.objectAt(0);
    var priority = get(person, "priority");
    equal(priority, undefined, "should not have changed the priority");
  });

  test("firebaseChildMoved ignores items which don't exist", function(){
    var snapshot = mockSnapshot({name: "New"});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["1", "2", "3"], "should not have moved anything");
  });

  test("firebaseChildMoved moves an item to the start when no previous item name specified", function(){
    var snapshot = mockSnapshot({name: "2", priority: 1});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    deepEqual(collection.mapProperty("id"), ["2", "1", "3"], "should have moved to the start");
  });

  test("firebaseChildMoved moves an item to the end if the previous item doesn't exist", function(){
    var snapshot = mockSnapshot({name: "2", priority: 99});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot, "foo");
    });

    deepEqual(collection.mapProperty("id"), ["1", "3", "2"], "should have moved to the end");
  });

  test("firebaseChildMoved moves an item after the previous item name specified", function(){
    var snapshot = mockSnapshot({name: "1", priority: 25});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot, "2");
    });

    deepEqual(collection.mapProperty("id"), ["2", "1", "3"], "should have moved after the previous item");
  });


  module("FP.IndexedCollection with complex meta model receiving updates from Firebase", {
    setup: function() {
      setupEnv();

      var content = [ // poke in the internal format, should never do this for reals
        {id: "1", priority: 10},
        {id: "2", priority: 20},
        {id: "3", priority: 30}
      ];

      // prime the cache otherwise it does a find
      store.createRecord(App.Person, {id: "1", name: "Tom"});
      store.createRecord(App.Person, {id: "2", name: "Dick"});
      store.createRecord(App.Person, {id: "3", name: "Harry"});
      store.createRecord(App.Person, {id: "New"});

      App.Member = FP.MetaModel.extend({
        level: attr()
      });

      collection = FP.IndexedCollection.create({as: App.Member, store: store, content: content, model: App.Person});
    }
  });

  test("firebaseChildAdded adds an item", function(){
    var snapshot        = mockSnapshot({name: "New", val: {level: "admin"}, priority: 123});
    var emptyCollection = FP.IndexedCollection.create({as: App.Member, store: store, model: App.Person, firebasePath: "persons"});

    Ember.run(function(){
      emptyCollection.onFirebaseChildAdded(snapshot);
    });

    equal(emptyCollection.get("length"), 1, "should have added an item");

    var member  = emptyCollection.objectAt(0);
    ok(member instanceof App.Member, "should be instance of Member");

    var id = get(member, "id");
    equal(id, "New", "should have set the ID");

    var level = get(member, "level");
    equal(level, "admin", "should have set the meta atributes");

    var priority = get(member, "priority");
    equal(priority, 123, "should have set a priority");
  });

  test("firebaseChildMoved changes the item's priority", function(){
    var snapshot = mockSnapshot({name: "2", priority: 1});

    Ember.run(function(){
      collection.onFirebaseChildMoved(snapshot);
    });

    var person   = collection.objectAt(0);
    var priority = get(person, "priority");
    equal(priority, 1, "should have changed the priority");
  });

  module("FP.IndexedCollection with simple meta model receiving updates from Firebase", {
    setup: function() {
      setupEnv();

      // prime the cache otherwise it does a find
      store.createRecord(App.Person, {id: "New"});

      App.Member = FP.MetaModel.extend();

      collection = FP.IndexedCollection.create({as: App.Member, store: store, model: App.Person});
    }
  });

  test("firebaseChildAdded adds an item", function(){
    var snapshot        = mockSnapshot({name: "New", val: "admin", priority: 123});

    Ember.run(function(){
      collection.onFirebaseChildAdded(snapshot);
    });

    equal(collection.get("length"), 1, "should have added an item");

    var member  = collection.objectAt(0);
    ok(member instanceof App.Member, "should be instance of Member");

    var id = get(member, "id");
    equal(id, "New", "should have set the ID");

    var meta = get(member, "meta");
    equal(meta, "admin", "should have set the meta value");

    var priority = get(member, "priority");
    equal(priority, 123, "should have set a priority");
  });

})();
