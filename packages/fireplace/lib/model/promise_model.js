var get = Ember.get;

FP.PromiseModel = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin, {

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
  }

});