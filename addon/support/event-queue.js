// handles running multiple firebase events in the same run-loop

import Ember from 'ember';

const EventQueue = function() {
  this.pending = [];
};

export default EventQueue;

EventQueue.prototype = {
  enqueue(fn, context) {
    this.pending.push([fn, context]);

    if (!this.running) {
      this.running = true;
      // TODO - running in the next runloop breaks the tests
      // how to solve this without this hack?
      const run = Ember.testing ? Ember.run : Ember.run.next;
      run(this, this.flush);
    }
  },

  flush() {
    // if a batch queues items itself we want to make sure we run those too
    // otherwise they'll be ignored
    while (this.pending.length) {
      let batch = this.pending;
      this.pending = [];
      this.runBatch(batch);
    }

    this.running = false;
  },

  runBatch(batch) {
    batch.forEach(item => {
      const fn      = item[0];
      const context = item[1];
      fn.call(context);
    });
  }
};
