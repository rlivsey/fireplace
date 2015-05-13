import Ember from 'ember';

import {module, test} from 'qunit';

import MutableSnapshot from 'fireplace/support/mutable-snapshot';

import { makeSnapshot } from '../../helpers/firebase';

var snapshot;
module('MutableSnapshot - with no snapshot', {
  beforeEach() {
    snapshot = new MutableSnapshot();
  }
});

test("has defaults values", function(assert) {
  assert.equal(snapshot.key(),        null);
  assert.equal(snapshot.getPriority(), null);
  assert.equal(snapshot.val(),         null);
  assert.equal(snapshot.ref(),         null);
  assert.equal(snapshot.numChildren(), 0);
});

test("calling child returns another blank MutableSnapshot", function(assert) {
  var child = snapshot.child("foo");
  assert.ok(child instanceof MutableSnapshot, "child is a mutable snapshot");
  assert.notEqual(child, snapshot, "is a different snapshot");
  assert.equal(child.val(), null);
});

test("can set and retreive a child", function(assert) {
  snapshot.setChild("foo", makeSnapshot("foo", "Bar"));
  var child = snapshot.child("foo");

  assert.ok(child instanceof MutableSnapshot, "child is a mutable snapshot");
  assert.equal(child.val(), "Bar");
});

module('MutableSnapshot - wrapping a snapshot', {
  beforeEach() {
    var wrapped = makeSnapshot("snap", {title: "Bob"}, 123);
    snapshot = new MutableSnapshot(wrapped);
  }
});

// this is testing mockSnapshot more than anything...
test("has values", function(assert) {
  assert.equal(snapshot.key(),        "snap",         "has a name");
  assert.equal(snapshot.getPriority(), 123,            "has a priority");
  assert.deepEqual(snapshot.val(),     {title: "Bob"}, "has a value");
});

test("can fetch the child", function(assert) {
  var child = snapshot.child("title");

  assert.ok(child instanceof MutableSnapshot, "child is a mutable snapshot");
  assert.notEqual(child, snapshot, "is a different snapshot");
  assert.equal(child.val(), "Bob", "has the correct value");
});

test("can update the child", function(assert) {
  snapshot.setChild("title", makeSnapshot("title", "Tom"));
  var child = snapshot.child("title");

  assert.ok(child instanceof MutableSnapshot, "child is a mutable snapshot");
  assert.equal(child.val(), "Tom", "has the correct value");
});

test("can remove the child", function(assert) {
  snapshot.setChild("title", null);
  var child = snapshot.child("title");

  assert.ok(child instanceof MutableSnapshot, "child is a mutable snapshot");
  assert.equal(child.val(), null, "has the correct value");
});

