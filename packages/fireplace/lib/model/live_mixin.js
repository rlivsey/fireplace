require('fireplace/transforms');
require('fireplace/model/event_queue');

var get = Ember.get,
    set = Ember.set;

var firebaseQueue = new FP.FirebaseEventQueue();

FP.LiveMixin = Ember.Mixin.create(Ember.Evented, {
  isListeningToFirebase:  false,
  concatenatedProperties: ['firebaseEvents'],
  firebaseEvents:         ['value'], // always listen to value for listenToFirebase promise

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
    get(this, 'firebaseEvents').forEach(this._addHandler, this);

    var _this = this;
    return Ember.RSVP.Promise(function(resolve) {
      _this.one("firebaseValue", function() {
        resolve();
      });
    });
  },

  stopListeningToFirebase: function() {
    if (!get(this, 'isListeningToFirebase')) {
      return;
    }

    set(this, 'isListeningToFirebase', false);

    var ref = this.buildFirebaseReference();

    var eventName, handler;
    for (eventName in this._fbEventHandlers) {
      handler = this._fbEventHandlers[eventName];
      ref.off(eventName, handler, this);
    }

    this._fbEventHandlers = {};
  },

  _addHandler: function(eventName) {
    var ref   = this.buildFirebaseReference(),
        _this = this;

    var handler = function() {
      firebaseQueue.enqueue(_this, eventName, arguments);
    };

    this._fbEventHandlers[eventName] = handler;
    ref.on(eventName, handler, this);
  }

});