import { module, test } from 'qunit';

import Collection from 'fireplace/collections/base';

module("Collection Queries", {
  beforeEach: function() {
    // collection = Collection.create({ firebaseReference: reference });
  }
});

test("doesn't filter when there are now query settings", function(assert) {
  assert.expect(0);
  const reference  = {}; // no methods, so we're sure we don't filter it
  const collection = Collection.create({ firebaseReference: reference });
  collection.buildFirebaseQuery();
});

test("startAt", function(assert) {
  const reference = {
    startAt: (value, key) => {
      assert.equal(value, 'start-value');
      assert.equal(key,    undefined);
    }
  };

  const collection = Collection.create({ firebaseReference: reference, startAt: 'start-value' });
  collection.buildFirebaseQuery();
});

test("startAt - value and key", function(assert) {
  const reference = {
    startAt: (value, key) => {
      assert.equal(value, 'start-value');
      assert.equal(key,   'start-key');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    startAt: {
      value: 'start-value',
      key:   'start-key'
    }
  });

  collection.buildFirebaseQuery();
});


test("endAt", function(assert) {
  const reference = {
    endAt: (value, key) => {
      assert.equal(value, 'end-value');
      assert.equal(key,    undefined);
    }
  };

  const collection = Collection.create({ firebaseReference: reference, endAt: 'end-value' });
  collection.buildFirebaseQuery();
});

test("endAt - value and key", function(assert) {
  const reference = {
    endAt: (value, key) => {
      assert.equal(value, 'end-value');
      assert.equal(key,   'end-key');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    endAt: {
      value: 'end-value',
      key:   'end-key'
    }
  });

  collection.buildFirebaseQuery();
});


test("limit", function(assert) {
  const reference = {
    limit: (value) => {
      assert.equal(value, 'limit-value');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    limit: 'limit-value'
  });

  collection.buildFirebaseQuery();
});

test("limitToFirst", function(assert) {
  const reference = {
    limitToFirst: (value) => {
      assert.equal(value, 'limit-value');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    limitToFirst: 'limit-value'
  });

  collection.buildFirebaseQuery();
});

test("limitToLast", function(assert) {
  const reference = {
    limitToLast: (value) => {
      assert.equal(value, 'limit-value');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    limitToLast: 'limit-value'
  });

  collection.buildFirebaseQuery();
});


test("orderByChild", function(assert) {
  const reference = {
    orderByChild: (key) => {
      assert.equal(key, 'child-key');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    orderByChild: 'child-key'
  });

  collection.buildFirebaseQuery();
});

test("orderByKey", function(assert) {
  const reference = {
    orderByKey: () => {
      assert.ok(true);
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    orderByKey: true
  });

  collection.buildFirebaseQuery();
});

test("orderByValue", function(assert) {
  const reference = {
    orderByValue: () => {
      assert.ok(true);
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    orderByValue: true
  });

  collection.buildFirebaseQuery();
});

test("orderByPriority", function(assert) {
  const reference = {
    orderByPriority: () => {
      assert.ok(true);
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    orderByPriority: true
  });

  collection.buildFirebaseQuery();
});

test("should only order by one thing at a time", function(assert) {
  const collection = Collection.create({
    firebaseReference: {},
    orderByPriority: true, // can't order by two things
    orderByValue:    true
  });

  assert.throws(() => {
    collection.buildFirebaseQuery();
  }, new Error("Assertion Failed: you can only order by one thing at a time"));
});


test("equalTo", function(assert) {
  const reference = {
    equalTo: (value, key) => {
      assert.equal(value, 'value');
      assert.equal(key,    undefined);
    }
  };

  const collection = Collection.create({ firebaseReference: reference, equalTo: 'value' });
  collection.buildFirebaseQuery();
});

test("equalTo - with falsy value", function(assert) {
  const reference = {
    equalTo: (value, key) => {
      assert.equal(value,  false);
      assert.equal(key,    undefined);
    }
  };

  const collection = Collection.create({ firebaseReference: reference, equalTo: false });
  collection.buildFirebaseQuery();
});

test("equalTo - value and key", function(assert) {
  const reference = {
    equalTo: (value, key) => {
      assert.equal(value, 'value');
      assert.equal(key,   'key');
    }
  };

  const collection = Collection.create({
    firebaseReference: reference,
    equalTo: {
      value: 'value',
      key:   'key'
    }
  });

  collection.buildFirebaseQuery();
});
