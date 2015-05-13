import EventQueue from 'fireplace/support/event-queue';

import {module, test} from 'qunit';

var queue;
module("Support - EventQueue", {
  beforeEach: function() {
    queue = new EventQueue();
  }
});

test("runs enqueued items in the right context", function(assert) {
  assert.expect(2);

  var context = function() {};

  queue.enqueue(function() {
    assert.ok(true, "called the queued function");
    assert.ok(this === context, "executes in the assigned context");
  }, context);
});

test("runs entries queued whilst flushing", function(assert) {
  assert.expect(1);

  queue.enqueue(function() {
    queue.enqueue(function() {
      assert.ok(true, "called the nested function");
    });
  });
});
