// handles running multiple firebase events in the same run-loop

var classify = Ember.String.classify;

FP.FirebaseEventQueue = function() {
  this.pending = [];
};

FP.FirebaseEventQueue.prototype = {
  enqueue: function(model, event, args) {
    this.pending.push([model, event, args]);

    if (!this.running) {
      this.running = true;
      Ember.run.next(this, this.flush);
    }
  },

  flush: function() {
    var model, eventName, args, classyName, handlerName, triggerName;

    this.pending.forEach(function(item){
      model = item[0];

      // if the model has been destroyed since the event came in, then
      // don't bother trying to update it - destroying stops listening to firebase
      // so it doesn't expect to receive any more updates anyway
      if (model.isDestroying || model.isDestroyed) {
        return;
      }

      eventName = item[1];
      args      = item[2];
      classyName= classify(eventName);

      handlerName = 'onFirebase' + classyName;
      triggerName = 'firebase' + classyName;

      model.trigger(triggerName, args);
      model[handlerName].apply(model, args);
    });

    this.pending = [];
    this.running = false;
  }
};
