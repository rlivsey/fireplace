(function(){

  var container;
  var attr = FP.attr;

  function serializes(transform, from, to) {
    deepEqual(transform.serialize(from), to);
  }

  function deserializes(transform, from, to) {
    deepEqual(transform.deserialize(from), to);
  }

  function transforms(transform, from, to) {
    serializes(transform, from, to);
    deserializes(transform, from, to);
  }

  module("Transforms");

  test("string", function() {
    var transform = FP.StringTransform.create();
    transforms(transform, "Scumbag Livsey", "Scumbag Livsey");
    transforms(transform, 1, "1");
    transforms(transform, "", "");
    transforms(transform, null, null);
    transforms(transform, undefined, null);
  });

  test("number", function() {
    var transform = FP.NumberTransform.create();
    transforms(transform, "1", 1);
    transforms(transform, "0", 0);
    transforms(transform, 1, 1);
    transforms(transform, 0, 0);
    transforms(transform, "", null);
    transforms(transform, null, null);
    transforms(transform, undefined, null);
    transforms(transform, true, 1);
    transforms(transform, false, 0);
  });

  test("boolean", function() {
    var transform = FP.BooleanTransform.create();
    transforms(transform, "1", true);
    transforms(transform, "", false);
    transforms(transform, 1, true);
    transforms(transform, 0, false);
    transforms(transform, null, false);
    transforms(transform, true, true);
    transforms(transform, false, false);
  });

  test("date", function() {
    var transform = FP.DateTransform.create();

    transforms(transform, null, null);
    transforms(transform, undefined, null);
    transforms(transform, 123, null);

    var date = new Date(Date.UTC(1981, 7, 21, 12, 30));
    serializes(transform, date, "1981-08-21T12:30:00.000Z");

    deserializes(transform, "1981-08-21T12:30:00.000Z", date);
  });

  test("timestamp", function() {
    var transform = FP.TimestampTransform.create();

    transforms(transform, null, null);
    transforms(transform, undefined, null);

    var time = new Date(Date.UTC(1981, 7, 21, 12, 30));
    serializes(transform, time, 367245000000);

    deserializes(transform, 367245000000, time);
  });

  test("hash - plain", function() {
    var transform = FP.HashTransform.create();

    transforms(transform, null, null);
    transforms(transform, undefined, null);

    transforms(transform, {a: 1, b: 2}, {a: 1, b: 2});
  });

  test("hash - with sub-transform", function() {
    var transform = FP.HashTransform.create(),
        container = new Ember.Container();

    container.register('transform:timestamp', FP.TimestampTransform);

    var date      = new Date(Date.UTC(1981, 7, 21, 12, 30)),
        timestamp = 367245000000;

    deepEqual(transform.serialize({a: date}, {of: "timestamp"}, container), {a: timestamp});
    deepEqual(transform.deserialize({a: timestamp}, {of: "timestamp"}, container), {a: date});
  });

  test("array - plain", function() {
    var transform = FP.ArrayTransform.create();

    transforms(transform, null, null);
    transforms(transform, undefined, null);

    transforms(transform, [1, 2], [1, 2]);
  });

  test("array - with sub-transform", function() {
    var transform = FP.ArrayTransform.create(),
        container = new Ember.Container();

    container.register('transform:timestamp', FP.TimestampTransform);

    var date      = new Date(Date.UTC(1981, 7, 21, 12, 30)),
        timestamp = 367245000000;

    deepEqual(transform.serialize([date], {of: "timestamp"}, container), [timestamp]);
    deepEqual(transform.deserialize([timestamp], {of: "timestamp"}, container), [date]);
  });

})();