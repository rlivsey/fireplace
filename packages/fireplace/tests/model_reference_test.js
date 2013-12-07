(function(){

  var get = Ember.get;
  var store;

  module("Store.buildFirebaseReference");

  test("firebaseRoot can be a String", function() {
    store = FP.Store.create({firebaseRoot: "https://foobar.firebaseio.com"});

    var ref = store.buildFirebaseRootReference();
    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), "https://foobar.firebaseio.com", "reference should point to the right place");
  });

  test("firebaseRoot can be a Firebase object", function() {
    store = FP.Store.create({firebaseRoot: new Firebase("https://foobar.firebaseio.com/some/path")});

    var ref = store.buildFirebaseRootReference();
    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), "https://foobar.firebaseio.com/some/path", "reference should point to the right place");
  });

  var App, rootRef = "https://foobar.firebaseio.com";

  module("Model.buildFirebaseReference", {
    setup: function() {
      App = Ember.Namespace.create({name: "App"});

      store = FP.Store.create({
        firebaseRoot: rootRef
      });

      App.Person = FP.Model.extend();
      App.Person.store = store;
    }
  });

  test("defaults to lowercase, underscored & pluralized class name", function(){
    var ref = App.Person.buildFirebaseReference();

    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/people", "reference should be lowercased, underscored and pluralized");

    // people only tests lowercase & plural, lets test underscored

    App.SomeThing = FP.Model.extend();
    App.SomeThing.store = store;
    ref = App.SomeThing.buildFirebaseReference();
    equal(ref.toString(), rootRef + "/some_things", "reference should be lowercased, underscored and pluralized");
  });


  test("uses firebasePath as a string", function(){
    App.Person.reopenClass({
      firebasePath: "persons"
    });

    var ref = App.Person.buildFirebaseReference();
    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/persons", "reference should point to the right place");
  });

  test("uses firebasePath as a function", function(){
    expect(4);

    var refOptions = {name: "bar"};

    App.Person.reopenClass({
      firebasePath: function(opts) {
        equal(get(opts, "name"), "bar", "passes the options from buildFirebaseReference through to firebasePath");
        ok(opts instanceof Ember.Object, "turns plain options hash to Ember.Object so we can use opts.get etc...");
        return "foo/"+opts.get("name");
      }
    });

    var ref = App.Person.buildFirebaseReference(refOptions);
    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/foo/bar", "reference should point to the right place");
  });

  test("firebasePath can return a reference", function() {
    App.Person.reopenClass({
      firebasePath: function(opts) {
        // normally so you can do opts.get("something").buildFirebaseReference().parent().child("/foo")
        // to build up the hierarchy with firebase objects
        return new Firebase("https://somewhere.firebaseio.com/foo/bar/baz");
      }
    });

    var ref = App.Person.buildFirebaseReference();
    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), "https://somewhere.firebaseio.com/foo/bar/baz", "reference should point to the right place");
  });

  module("Model#buildFirebaseReference", {
    setup: function() {
      App = Ember.Namespace.create({name: "App"});

      store = FP.Store.create({
        firebaseRoot: rootRef
      });

      App.Person = FP.Model.extend();
      App.Person.store = store;
    }
  });

  test("defaults to pluralized class name with ID", function(){
    var person = App.Person.create({id: 123}),
        ref    = person.buildFirebaseReference();

    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/people/123", "reference should point to the right place");
  });

  test("uses class reference with ID appended", function() {
    App.Person.reopenClass({
      firebasePath: "persons"
    });

    var person = App.Person.create({id: 123}),
        ref = person.buildFirebaseReference();

    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/persons/123", "reference should point to the right place");
  });

  test("passes itself to class.buildFirebaseReference", function(){
    App.Person.reopenClass({
      firebasePath: function(opts) {
        return "persons/"+opts.get("foo");
      }
    });

    var person = App.Person.create({id: 123, foo: "bar"}),
        ref = person.buildFirebaseReference();

    ok(ref instanceof Firebase, "reference should be instance of Firebase");
    equal(ref.toString(), rootRef + "/persons/bar/123", "reference should point to the right place");
  });

})();