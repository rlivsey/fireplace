import Ember from 'ember';

var get      = Ember.get;
var set      = Ember.set;
var classify = Ember.String.classify;

export default Ember.Mixin.create(Ember.Evented, {
  isListeningToFirebase:  false,
  concatenatedProperties: ['firebaseEvents'],
  firebaseEvents:         ['value'], // always listen to value for listenToFirebase promise

  buildFirebaseReference: function() {
    Ember.assert("You must override buildFirebaseReference");
  },

  // override to limit the reference by startAt/endAt/limit
  // this is mainly for collections
  buildFirebaseQuery: function() {
    return this.buildFirebaseReference();
  },

  changeCameFromFirebase: function() {
    return !!this._settingFromFirebase;
  }.property().volatile(),

  settingFromFirebase: function(fn) {
    this._settingFromFirebase = true;
    fn.call(this);
    this._settingFromFirebase = false;
  },

  willDestroy: function() {
    this.stopListeningToFirebase();
  },

  listenToFirebase: function() {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    if (get(this, 'isListeningToFirebase')) {
      return Ember.RSVP.resolve();
    }

    set(this, 'isListeningToFirebase', true);

    this._fbEventHandlers = {};

    var ref   = this.buildFirebaseQuery(),
        _this = this,
        handler;

    get(this, 'firebaseEvents').forEach(function(eventName) {
      handler = this.buildHandler(eventName);
      this._fbEventHandlers[eventName] = handler;
      ref.on(eventName, handler, this);
    }, this);

    return new Ember.RSVP.Promise(function(resolve) {
      _this.one("firebaseValue", function() {
        resolve();
      });
    }, "FP: Value "+ref.toString());
  },

  buildHandler: function(eventName) {
    var classyName  = classify(eventName),
        handlerName = 'onFirebase' + classyName,
        triggerName = 'firebase'   + classyName,
        store       = this.store;

    return function() {
      var args = arguments;
      store.enqueueEvent(function(){
        // if the we have been destroyed since the event came in, then
        // don't bother trying to update - destroying stops listening to firebase
        // so we don't expect to receive any more updates anyway
        if (this.isDestroying || this.isDestroyed) {
          return;
        }

        this.trigger(triggerName, args);
        this[handlerName].apply(this, args);
      }, this);
    };
  },

  stopListeningToFirebase: function() {
    if (!get(this, 'isListeningToFirebase')) {
      return;
    }

    set(this, 'isListeningToFirebase', false);

    var ref = this.buildFirebaseQuery();

    var eventName, handler;
    for (eventName in this._fbEventHandlers) {
      handler = this._fbEventHandlers[eventName];
      ref.off(eventName, handler, this);
    }

    this._fbEventHandlers = {};
  }

});