import Ember from 'ember';

import {module, test} from 'qunit';

import MetaModel from 'fireplace/model/meta-model';
import Model     from 'fireplace/model/model';
import attr      from 'fireplace/model/attr';

var get = Ember.get;

module("MetaModel - serializing");

test("with no attributes / relationships or meta data", function(assert) {

  var Member = MetaModel.extend();
  var member = Member.create();

  assert.equal(member.toFirebaseJSON(), true, "defaults to true");
});

test("with a meta value", function(assert) {
  var Member = MetaModel.extend();
  var member = Member.create({meta: "admin"});

  assert.equal(member.toFirebaseJSON(), "admin", "serializes the meta value");
});

test("with attributes / relationships", function(assert) {
  var Member = MetaModel.extend({
    level: attr()
  });
  var member = Member.create({level: "admin"});

  assert.deepEqual(member.toFirebaseJSON(), {level: "admin"}, "serializes attributes");
});

test("with attributes / relationships which are null", function(assert) {
  var Member = MetaModel.extend({
    level: attr()
  });
  var member = Member.create({level: null});

  assert.deepEqual(member.toFirebaseJSON(), true, "falls back to true");
});

// if you've got attributes, then meta should be ignored
test("with attributes / relationships which are null and a meta value", function(assert) {
  var Member = MetaModel.extend({
    level: attr()
  });
  var member = Member.create({level: null, meta: "something"});

  assert.deepEqual(member.toFirebaseJSON(), true, "falls back to true, and not the meta value");
});

test("with priority", function(assert) {
  var Member = MetaModel.extend();
  var member = Member.create({priority: 123});

  assert.deepEqual(member.toFirebaseJSON(true), {
    ".value": true,
    ".priority": 123
  }, "serializes with firebase's export format");
});

module("MetaModel - properties");

test("should not bleed own properties into content", function(assert) {
  var Meta  = MetaModel.extend();
  var Child = Model.extend();

  var child = Child.create();
  var meta  = Meta.create({content: child});

  meta.setProperties({
    meta:      "meta",
    priority:  "priority",
    parent:    "parent",
    parentKey: "key"
  });

  assert.ok(!get(child, "meta"),     "child should have not set meta");
  assert.ok(!get(child, "priority"), "child should have not set priority");
  assert.ok(!get(child, "parent"),   "child should have not set parent");
  assert.ok(!get(child, "parentKey"),"child should have not set parentKey");
});

test("uses child's ID", function(assert) {
  var Meta  = MetaModel.extend();
  var Child = Model.extend();

  var child = Child.create({id: 123});
  var meta  = Meta.create({content: child});

  assert.equal(get(meta, 'id'), 123, "should have child ID");
});

module("MetaModel - content");

test("saveContent saves a meta model's content", function(assert) {
  assert.expect(1);

  var Meta  = MetaModel.extend();
  var Child = Model.extend();

  var child = Child.create({id: 123});
  var meta  = Meta.create({content: child});

  child.save = function() {
    assert.ok(true, "called save on the content");
  };

  meta.saveContent();
});

module("MetaModel - changes");

test("considers a change having come from firebase if either itself or its content is being updated", function(assert) {
  assert.expect(2);

  var Meta  = MetaModel.extend();
  var Child = Model.extend();

  var child = Child.create({id: 123});
  var meta  = Meta.create({content: child});

  child._settingFromFirebase = true;
  assert.ok(get(meta, 'changeCameFromFirebase'), "should think change came from Firebase");
  child._settingFromFirebase = false;

  meta._settingFromFirebase = true;
  assert.ok(get(meta, 'changeCameFromFirebase'), "should think change came from Firebase");
  meta._settingFromFirebase = false;
});
