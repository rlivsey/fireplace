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
      return Ember.RSVP.reject();
    }

    // prevent race condition where we're waiting for FB to respond
    // and another listen call comes in
    if (this._listenPromise) {
      return this._listenPromise;
    }

    if (get(this, 'isListeningToFirebase')) {
      return Ember.RSVP.resolve();
    }

    set(this, 'isListeningToFirebase', true);

    this._fbEventHandlers = {};

    // ensure value is listened to last, this doesn't matter for Firebase
    // as child_added is called before value, but in MockFirebase it appears
    // that the events are triggered in the order they are setup
    var events = get(this, 'firebaseEvents').slice().reverse();

    var ref    = this.buildFirebaseQuery();
    var _this  = this;

    var handler;
    var errHandler;

    events.forEach(function(eventName) {
      handler    = this.buildHandler(eventName);
      errHandler = this.buildErrorHandler(eventName);

      this._fbEventHandlers[eventName] = handler;
      ref.on(eventName, handler, errHandler, this);
    }, this);

    this._listenPromise = new Ember.RSVP.Promise(function(resolve, reject) {
      _this.one("firebaseValue",      resolve);
      _this.one("firebaseValueError", reject);
    }, "FP: Value "+ref.toString()).catch(function(e) {
      set(_this, 'isListeningToFirebase', false);
      return Ember.RSVP.reject(e);
    }).finally(function() {
      _this._listenPromise = null;
    });

    return this._listenPromise;
  },

  buildErrorHandler: function(eventName) {
    var triggerName = 'firebase' + classify(eventName) + "Error";
    return function(e) {
      this.trigger(triggerName, e);
    };
  },

  buildHandler: function(eventName) {
    var classyName  = classify(eventName);
    var handlerName = 'onFirebase' + classyName;
    var triggerName = 'firebase'   + classyName;
    var store       = this.store;

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
    this._listenPromise = null;

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