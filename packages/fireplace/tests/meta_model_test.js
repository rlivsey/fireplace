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

test("with priority", function() {
  var Member = FP.MetaModel.extend();
  var member = Member.create({priority: 123});

  deepEqual(member.toFirebaseJSON(true), {
    ".value": true,
    ".priority": 123
  }, "serializes with firebase's export format");
});