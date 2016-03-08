import Ember from 'ember';

const get      = Ember.get;
const set      = Ember.set;
const classify = Ember.String.classify;

function isFastboot() {
  return typeof FastBoot !== "undefined";
}

export default Ember.Mixin.create(Ember.Evented, {
  isListeningToFirebase:  false,
  concatenatedProperties: ['firebaseEvents'],
  firebaseEvents:         ['value'], // always listen to value for listenToFirebase promise

  buildFirebaseReference() {
    Ember.assert("You must override buildFirebaseReference");
  },

  // override to limit the reference by startAt/endAt/limit
  // this is mainly for collections
  buildFirebaseQuery() {
    return this.buildFirebaseReference();
  },

  changeCameFromFirebase: Ember.computed(function() {
    return !!this._settingFromFirebase;
  }).volatile(),

  settingFromFirebase(fn) {
    this._settingFromFirebase = true;
    fn.call(this);
    this._settingFromFirebase = false;
  },

  willDestroy() {
    this.stopListeningToFirebase();
  },

  listenToFirebase() {
    if (isFastboot()) {
      return Ember.RSVP.resolve();
    }

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
    const events = get(this, 'firebaseEvents').slice().reverse();

    const ref = this.buildFirebaseQuery();

    const promise = this._listenPromise = new Ember.RSVP.Promise((resolve, reject) => {
      this.one("firebaseValue",      resolve);
      this.one("firebaseValueError", reject);
    }, "FP: Value "+ref.toString()).catch(e => {
      set(this, 'isListeningToFirebase', false);
      return Ember.RSVP.reject(e);
    }).finally(() => {
      this._listenPromise = null;
    });

    events.forEach(eventName => {
      const handler    = this.buildHandler(eventName);
      const errHandler = this.buildErrorHandler(eventName);

      this._fbEventHandlers[eventName] = handler;
      ref.on(eventName, handler, errHandler, this);
    });

    return promise;
  },

  buildErrorHandler(eventName) {
    const triggerName = 'firebase' + classify(eventName) + "Error";
    return e => this.trigger(triggerName, e);
  },

  buildHandler(eventName) {
    const classyName  = classify(eventName);
    const handlerName = 'onFirebase' + classyName;
    const triggerName = 'firebase'   + classyName;
    const store       = this.store;

    return (...args) => {
      store.enqueueEvent(() => {

        // if the we have been destroyed since the event came in, then
        // don't bother trying to update - destroying stops listening to firebase
        // so we don't expect to receive any more updates anyway
        if (this.isDestroying || this.isDestroyed) {
          return;
        }

        this.trigger(triggerName, args);
        this[handlerName].apply(this, args);
      });
    };
  },

  stopListeningToFirebase() {
    if (isFastboot()) {
      return;
    }

    this._listenPromise = null;

    if (!get(this, 'isListeningToFirebase')) {
      return;
    }

    set(this, 'isListeningToFirebase', false);

    const ref = this.buildFirebaseQuery();

    for (let eventName in this._fbEventHandlers) {
      const handler = this._fbEventHandlers[eventName];
      ref.off(eventName, handler, this);
    }

    this._fbEventHandlers = {};
  }

});