// handles running multiple firebase events in the same run-loop

var classify = Ember.String.classify;

FP.FirebaseEventQueue = function() {
  this.pending = [];
};

FP.FirebaseEventQueue.prototype = {
  enqueue: function(context, fn) {
    this.pending.push([context, fn]);

    if (!this.running) {
      this.running = true;
      Ember.run.next(this, this.flush);
    }
  },

  flush: function() {
    var context, fn;

    this.pending.forEach(function(item){
      context = item[0];
      fn      = item[1];
      fn.call(context);
    });

    this.pending = [];
    this.running = false;
  }
};
