import Ember from 'ember';

const set     = Ember.set;
const get     = Ember.get;
const resolve = Ember.RSVP.resolve;

// reimplemented private method from Ember, but with setting
// _settingFromFirebase so we can avoid extra saves down the line

function observePromise(proxy, promise) {
  promise.then(value => {
    set(proxy, 'isFulfilled', true);
    value._settingFromFirebase = true;
    set(proxy, 'content', value);
    value._settingFromFirebase = false;
  }, reason => {
    set(proxy, 'isRejected', true);
    set(proxy, 'reason', reason);
    // don't re-throw, as we are merely observing
  });
}

export default Ember.ObjectProxy.extend(Ember.PromiseProxyMixin, {

  // forward on all content's functions where it makes sense to do so
  _setupContentForwarding: Ember.on("init", Ember.observer('content', function() {
    const obj = get(this, "content");
    if (!obj) { return; }

    for (let prop in obj) {
      if (!this[prop] && typeof obj[prop] === "function") {
        this._forwardToContent(prop);
      }
    }
  })),

  _forwardToContent(prop) {
    this[prop] = (...args) => {
      const content = this.get("content");
      return content[prop].apply(content, args);
    };
  },

  // re-implemented from Ember so we can call our own observePromise
  promise: Ember.computed({
    get() {
      throw new Ember.Error("PromiseProxy's promise must be set");
    },
    set(key, promise) {
      promise = resolve(promise);
      observePromise(this, promise);
      return promise.then(); // fork the promise.
    }
  })

});
