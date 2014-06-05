(function(){
  var snapshot;

  module('FP.MutableSnapshot with no snapshot', {
    setup: function() {
      snapshot = new FP.MutableSnapshot();
    }
  });

  test("has defaults values", function() {
    equal(snapshot.name(),        null);
    equal(snapshot.getPriority(), null);
    equal(snapshot.val(),         null);
    equal(snapshot.ref(),         null);
    equal(snapshot.numChildren(), 0);
  });

  test("calling child returns another blank MutableSnapshot", function() {
    var child = snapshot.child("foo");
    ok(child instanceof FP.MutableSnapshot, "child is a mutable snapshot");
    notEqual(child, snapshot, "is a different snapshot");
    equal(child.val(), null);
  });

  test("can set and retreive a child", function() {
    snapshot.setChild("foo", mockSnapshot({name: "foo", val: "Bar"}));
    var child = snapshot.child("foo");

    ok(child instanceof FP.MutableSnapshot, "child is a mutable snapshot");
    equal(child.val(), "Bar");
  });

  module('FP.MutableSnapshot wrapping a snapshot', {
    setup: function() {
      var wrapped = mockSnapshot({name: "snap", val: {title: "Bob"}, priority: 123});
      snapshot = new FP.MutableSnapshot(wrapped);
    }
  });

  // this is testing mockSnapshot more than anything...
  test("has values", function() {
    equal(snapshot.name(),        "snap",         "has a name");
    equal(snapshot.getPriority(), 123,            "has a priority");
    deepEqual(snapshot.val(),     {title: "Bob"}, "has a value");
    equal(snapshot.numChildren(), 1,              "has one child");
  });

  test("can fetch the child", function() {
    var child = snapshot.child("title");

    ok(child instanceof FP.MutableSnapshot, "child is a mutable snapshot");
    notEqual(child, snapshot, "is a different snapshot");
    equal(child.val(), "Bob", "has the correct value");
  });

  test("can update the child", function() {
    snapshot.setChild("title", mockSnapshot({name: "title", val: "Tom"}));
    var child = snapshot.child("title");

    ok(child instanceof FP.MutableSnapshot, "child is a mutable snapshot");
    equal(child.val(), "Tom", "has the correct value");
  });

  test("can remove the child", function() {
    snapshot.setChild("title", null);
    var child = snapshot.child("title");

    ok(child instanceof FP.MutableSnapshot, "child is a mutable snapshot");
    equal(child.val(), null, "has the correct value");
  });

})();