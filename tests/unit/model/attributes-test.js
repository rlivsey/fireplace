import Ember from 'ember';

import { moduleFor, test } from 'ember-qunit';

import Model     from 'fireplace/model/model';
import attr      from 'fireplace/model/attr';
import Transform from 'fireplace/transforms/base';

import { makeSnapshot } from '../../helpers/firebase';

const get = Ember.get;
const set = Ember.set;

moduleFor("service:store", "Model - Attributes", {
  subject(options, factory) {
    const firebase = new window.MockFirebase("https://something.firebaseio.com");
    firebase.autoFlush(true);

    return factory.create({
      firebaseRoot: firebase
    });
  }
});

test("An attribute can be set", function(assert) {
  this.register("model:page", Model.extend({
    title: attr()
  }));

  const page = this.subject().createRecord("page", {title: "The title"});
  assert.equal(get(page, "title"), "The title", "attribute has the right value");
});

test("An attribute can have a default value", function(assert) {
  this.register("model:page", Model.extend({
    title: attr({default: "The default"})
  }));

  const page = this.subject().createRecord("page");
  assert.equal(get(page, "title"), "The default", "attribute has the default value");

  set(page, "title", "overwritten");
  assert.equal(get(page, "title"), "overwritten", "attribute can be overwritten");
});

test("An attribute can have a default function", function(assert) {
  this.register("model:page", Model.extend({
    title: attr({default() { return "The default"; }})
  }));

  const page = this.subject().createRecord("page");
  assert.equal(get(page, "title"), "The default", "attribute has the default value");

  set(page, "title", "overwritten");
  assert.equal(get(page, "title"), "overwritten", "attribute can be overwritten");
});

test("Default value functions are called in the object's context", function(assert) {
  this.register("model:page", Model.extend({
    defaultTitle: "default from this",
    title: attr({default() { return get(this, 'defaultTitle'); }})
  }));

  const page = this.subject().createRecord("page");
  assert.equal(get(page, "title"), "default from this", "attribute has the default value");
});

test("Default value returns when setting null/undefined", function(assert) {
  this.register("model:page", Model.extend({
    title: attr({default: "The default"})
  }));

  const page = this.subject().createRecord("page", {title: "The title"});
  assert.equal(get(page, "title"), "The title", "attribute has been set");

  set(page, "title", null);
  assert.equal(get(page, "title"), "The default", "the default has come back");
});

test("An attribute gets its value from the snapshot if present", function(assert) {

  const snapshot = makeSnapshot("page", {
    title: "Snapshot title"
  });

  this.register("model:page", Model.extend({
    title: attr()
  }));

  const page = this.subject().createRecord("page", { snapshot });
  assert.equal(get(page, "title"), "Snapshot title", "the title is from the snapshot");

  set(page, "title", "A new title");
  assert.equal(get(page, "title"), "A new title", "the attribute can be set");
});

test("An attribute gets its value from the underscored version of its name", function(assert) {
  this.register("model:page", Model.extend({
    chapterTitle: attr()
  }));

  const snapshot = makeSnapshot("page", {
    chapter_title: "Snapshot title"
  });

  const page = this.subject().createRecord("page", { snapshot });
  assert.equal(get(page, "chapterTitle"), "Snapshot title", "the title is from the snapshot");
});

test("An attribute can specify the key to use from the snapshot", function(assert) {
  this.register("model:page", Model.extend({
    title: attr({key: "the_title"})
  }));

  const snapshot = makeSnapshot("page", {
    the_title: "Snapshot title"
  });

  const page = this.subject().createRecord("page", { snapshot });
  assert.equal(get(page, "title"), "Snapshot title", "the title is from the snapshot");
});

test("An attribute can have a type", function(assert) {
  this.register("model:page", Model.extend({
    title: attr(),
    number: attr("number", {default: 1})
  }));

  const page = this.subject().createRecord("page");
  assert.equal(get(page, "number"), 1, "the default still works as a 2nd parameter");
});

test("attribute transforms are looked up on the container", function(assert) {
  assert.expect(2);

  this.register("transform:capitals", Transform.extend({
    deserialize(value) {
      assert.ok(true, "deserialize called");
      return value.toUpperCase();
    }
  }));

  this.register("model:page", Model.extend({
    title: attr("capitals")
  }));

  const snapshot = makeSnapshot("page", {
    title: "a title"
  });

  const page = this.subject().createRecord("page", { snapshot });
  assert.strictEqual(get(page, "title"), "A TITLE", "the attribute should be deserialized");
});

test("An attribute can have a local deserializer function", function(assert) {
  assert.expect(2);

  this.register("model:page", Model.extend({
    title: attr({deserialize(value) {
      assert.ok(true, "deserialize called");
      return value.toUpperCase();
    }})
  }));

  const snapshot = makeSnapshot("page", {
    title: "the title"
  });

  const page = this.subject().createRecord("page", { snapshot });
  assert.equal(get(page, "title"), "THE TITLE", "the value is deserialized");
});