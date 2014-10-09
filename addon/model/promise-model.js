import Ember from 'ember';

var set     = Ember.set;
var get     = Ember.get;
var resolve = Ember.RSVP.resolve;

// reimplemented private method from Ember, but with setting
// _settingFromFirebase so we can avoid extra saves down the line

function observePromise(proxy, promise) {
  promise.then(function(value) {
    set(proxy, 'isFulfilled', true);
    value._settingFromFirebase = true;
    set(proxy, 'content', value);
    value._settingFromFirebase = false;
  }, function(reason) {
    set(proxy, 'isRejected', true);
    set(proxy, 'reason', reason);
    // don't re-throw, as we are merely observing
  });
}

export default Ember.ObjectProxy.extend(Ember.PromiseProxyMixin, {

  // forward on all content's functions where it makes sense to do so
  _setupContentForwarding: function() {
    var obj = get(this, "content");
    if (!obj) { return; }

    for (var prop in obj) {
      if (!this[prop] && typeof obj[prop] === "function") {
        this._forwardToContent(prop);
      }
    }
  }.observes("content").on("init"),

  _forwardToContent: function(prop) {
    this[prop] = function() {
      var content = this.get("content");
      return content[prop].apply(content, arguments);
    };
  },

  // re-implemented from Ember so we can call our own observePromise
  promise: Ember.computed(function(key, promise) {
    if (arguments.length === 2) {
      promise = resolve(promise);
      observePromise(this, promise);
      return promise.then(); // fork the promise.
    } else {
      throw new Ember.Error("PromiseProxy's promise must be set");
    }
  })

});
