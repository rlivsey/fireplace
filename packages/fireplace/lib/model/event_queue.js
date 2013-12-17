// handles running multiple firebase events in the same run-loop

var classify = Ember.String.classify;

FP.FirebaseEventQueue = function() {
  this.pending = [];
};

FP.FirebaseEventQueue.prototype = {
  enqueue: function(fn, context) {
    this.pending.push([fn, context]);

    if (!this.running) {
      this.running = true;
      // TODO - running in the next runloop breaks the tests
      // how to solve this without this hack?
      var run = Ember.testing ? Ember.run : Ember.run.next;
      run(this, this.flush);
    }
  },

  flush: function() {
    var context, fn;

    this.pending.forEach(function(item){
      fn      = item[0];
      context = item[1];
      fn.call(context);
    });

    this.pending = [];
    this.running = false;
  }
};
