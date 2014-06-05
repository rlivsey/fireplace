(function(env){

  Ember.testing     = true;
  Ember.LOG_VERSION = false;

  // Mock implementation of Firebase
  // TODO - flesh this out as necessary

  var Firebase = function(url) {
    this.url        = url;
    this.childCache = {};
  };

  Firebase.prototype.child = function(name) {
    var child = this.childCache[name];
    if (!child) {
      child = new Firebase(this.url + "/" + name);
      this.childCache[name] = child;
    }
    return child;
  };

  Firebase.prototype.parent = function(name) {
    var parts = this.url.split("/");
    parts.pop();
    var url = parts.join("/");
    return new Firebase(url);
  };

  Firebase.prototype.name = function(name) {
    var parts = this.url.split("/");
    return parts.pop();
  };

  Firebase.prototype.toString = function() {
    return this.url;
  };

  Firebase.prototype.on  = function(event, cb) { return cb; }
  Firebase.prototype.off = function(event, cb) { return cb; }

  var uid = 0;
  Firebase.prototype.push = function() { return this.child("firebase-"+uid++); }

  env.Firebase = Firebase;

  env.mockReference = function(overrides) {
    overrides = overrides || {};
    var fp = new Firebase();
    for (var key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        fp[key] = overrides[key];
      }
    }
    return fp;
  };

  env.stubReference = function(obj, overrides) {
    obj.buildFirebaseReference = function() {
      return mockReference(overrides);
    };
    return obj;
  };

  env.mockSnapshot = function(attrs) {
    attrs = attrs || {};
    return {
      ref:         function() { return new Firebase("https://nowhere.firebaseio.com/"+attrs.name); },
      name:        function() { return attrs.name;     },
      val:         function() { return attrs.val;      },
      getPriority: function() { return attrs.priority; },
      child:       function(key) {
        var childData = this.val()[key];
        if (childData) {
          return mockSnapshot({name: key, val: childData});
        }
      },
      numChildren: function() {
        return Object.keys(this.val()).length
      },
      // TODO - sort by priority if we rely on that in the tests
      forEach: function(cb) {
        var data = this.val(), snap, childData;
        for (var childName in data) {
          childData = data[childName];
          snap = env.mockSnapshot({
            name:     childName,
            val:      childData,
            priority: childData.priority
          });

          // stop when truthy
          if(cb(snap)) {
            break;
          }
        }
      }
    };
  };

  FP.Store.reopen({
    firebaseRoot: "https://nowhere.firebaseio.com"
  });
})(window);