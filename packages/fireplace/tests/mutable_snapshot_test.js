(function(){
  module('FP.MutableSnapshot');

  test("wraps a snapshot", function() {
    var snapshot = mockSnapshot({name: "snap", val: {title: "Bob"}, priority: 123});
    var mutable = new FP.MutableSnapshot(snapshot);

    deepEqual(mutable.name(),        snapshot.name(),        "has the same name");
    deepEqual(mutable.val(),         snapshot.val(),         "has the same value");
    deepEqual(mutable.getPriority(), snapshot.getPriority(), "has the same priority");
  });

  test("sets values", function() {
    var snapshot = mockSnapshot({val: {firstname: "Bob", surname: "Smith"}});
    var mutable = new FP.MutableSnapshot(snapshot);
    var expected;

    mutable.set("firstname", "John");
    expected = {firstname: "John", surname: "Smith"};
    deepEqual(mutable.val(), {firstname: "John", surname: "Smith"}, "has updated the value");

    mutable.set("other", "Thing");
    expected = {firstname: "John", surname: "Smith", other: "Thing"};
    deepEqual(mutable.val(), expected, "set a new value");
  });
})();