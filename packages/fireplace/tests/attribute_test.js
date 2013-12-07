(function(){

  var attr = FP.attr, get = Ember.get, set = Ember.set;

  var container;

  module("Attributes", {
    setup: function() {
      container = new Ember.Container();
    }
  });

  test("An attribute can be set", function(){
    var Page = FP.Model.extend({
      title: attr()
    });

    var page = Page.create({title: "The title"});
    equal(get(page, "title"), "The title", "attribute has the right value");
  });

  test("An attribute can have a default value", function(){
    var Page = FP.Model.extend({
      title: attr({default: "The default"})
    });

    var page = Page.create();
    equal(get(page, "title"), "The default", "attribute has the default value");

    set(page, "title", "overwritten");
    equal(get(page, "title"), "overwritten", "attribute can be overwritten");
  });

  test("An attribute can have a default function", function(){
    var Page = FP.Model.extend({
      title: attr({default: function() { return "The default"; }})
    });

    var page = Page.create();
    equal(get(page, "title"), "The default", "attribute has the default value");

    set(page, "title", "overwritten");
    equal(get(page, "title"), "overwritten", "attribute can be overwritten");
  });

  test("Default value functions are called in the object's context", function(){
    var Page = FP.Model.extend({
      defaultTitle: "default from this",
      title: attr({default: function() { return get(this, 'defaultTitle'); }})
    });

    var page = Page.create();
    equal(get(page, "title"), "default from this", "attribute has the default value");
  });

  test("Default value returns when setting null/undefined", function(){
    var Page = FP.Model.extend({
      title: attr({default: "The default"})
    });

    var page = Page.create({title: "The title"});
    equal(get(page, "title"), "The title", "attribute has been set");

    set(page, "title", null);
    equal(get(page, "title"), "The default", "the default has come back");
  });

  test("An attribute gets its value from the snapshot if present", function() {
    var Page = FP.Model.extend({
      title: attr()
    });

    var snapshot = mockSnapshot({val: {
      title: "Snapshot title"
    }});

    var page = Page.create({snapshot: snapshot});
    equal(get(page, "title"), "Snapshot title", "the title is from the snapshot");

    set(page, "title", "A new title");
    equal(get(page, "title"), "A new title", "the attribute can be set");
  });

  test("An attribute gets its value from the underscored version of its name", function() {
    var Page = FP.Model.extend({
      chapterTitle: attr()
    });

    var snapshot = mockSnapshot({val: {
      chapter_title: "Snapshot title"
    }});

    var page = Page.create({snapshot: snapshot});
    equal(get(page, "chapterTitle"), "Snapshot title", "the title is from the snapshot");
  });

  test("An attribute can specify the key to use from the snapshot", function() {
    var Page = FP.Model.extend({
      title: attr({key: "the_title"})
    });

    var snapshot = mockSnapshot({val: {
      the_title: "Snapshot title"
    }});

    var page = Page.create({snapshot: snapshot});
    equal(get(page, "title"), "Snapshot title", "the title is from the snapshot");
  });

  test("An attribute can have a type", function() {
    var Page = FP.Model.extend({
      title: attr(),
      number: attr("number", {default: 1})
    });

    var page = Page.create();
    equal(get(page, "number"), 1, "the default still works as a 2nd parameter");
  });

  test("attribute transforms are looked up on the container", function() {
    expect(2);

    container.register("transform:capitals", FP.Transform.extend({
      deserialize: function(value) {
        ok(true, "deserialize called");
        return value.toUpperCase();
      }
    }));

    var Page = FP.Model.extend({
      title: attr("capitals")
    });

    var page = Page.create({container: container, title: "a title"});
    strictEqual(get(page, "title"), "A TITLE", "the attribute should be deserialized");
  });

  test("An attribute can have a local deserializer function", function() {
    expect(2);

    var Page = FP.Model.extend({
      title: attr({deserialize: function(value) {
        ok(true, "deserialize called");
        return value.toUpperCase();
      }})
    });

    var page = Page.create({title: "the title"});
    equal(get(page, "title"), "THE TITLE", "the value is deserialized");
  });

})();