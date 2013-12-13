(function() {

  var get = Ember.get;

  module("FP.MetaModel Serializing");

  test("with no attributes / relationships or meta data", function() {

    var Member = FP.MetaModel.extend();
    var member = Member.create();

    equal(member.toFirebaseJSON(), true, "defaults to true");
  });

  test("with a meta value", function() {
    var Member = FP.MetaModel.extend();
    var member = Member.create({meta: "admin"});

    equal(member.toFirebaseJSON(), "admin", "serializes the meta value");
  });

  test("with attributes / relationships", function() {
    var Member = FP.MetaModel.extend({
      level: FP.attr()
    });
    var member = Member.create({level: "admin"});

    deepEqual(member.toFirebaseJSON(), {level: "admin"}, "serializes attributes");
  });

  test("with attributes / relationships which are null", function() {
    var Member = FP.MetaModel.extend({
      level: FP.attr()
    });
    var member = Member.create({level: null});

    deepEqual(member.toFirebaseJSON(), true, "falls back to true");
  });

  test("with priority", function() {
    var Member = FP.MetaModel.extend();
    var member = Member.create({priority: 123});

    deepEqual(member.toFirebaseJSON(true), {
      ".value": true,
      ".priority": 123
    }, "serializes with firebase's export format");
  });

  module("FP.MetaModel properties");

  test("should not bleed own properties into content", function() {
    var Meta  = FP.MetaModel.extend();
    var Child = FP.Model.extend();

    var child = Child.create();
    var meta  = Meta.create({content: child});

    meta.setProperties({
      meta:      "meta",
      priority:  "priority",
      parent:    "parent",
      parentKey: "key"
    });

    ok(!get(child, "meta"),     "child should have not set meta");
    ok(!get(child, "priority"), "child should have not set priority");
    ok(!get(child, "parent"),   "child should have not set parent");
    ok(!get(child, "parentKey"),"child should have not set parentKey");
  });

  test("uses child's ID", function() {
    var Meta  = FP.MetaModel.extend();
    var Child = FP.Model.extend();

    var child = Child.create({id: 123});
    var meta  = Meta.create({content: child});

    equal(get(meta, 'id'), 123, "should have child ID");
  });

})();