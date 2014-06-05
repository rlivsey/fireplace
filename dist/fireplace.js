(function() {

/**
  @module fireplace
*/

/* global FP: true */

/**
  All Fireplace methods and functions are defined inside of this namespace.

  @class FP
  @static
*/
var FP;
if ('undefined' === typeof FP) {
  FP = Ember.Namespace.create({
    VERSION: '0.0.14'
  });

  if ('undefined' !== typeof window) {
    window.FP = FP;
  }

  if (Ember.libraries) {
    Ember.libraries.registerCoreLibrary('Fireplace', FP.VERSION);
  }
}


})();

(function() {

// options
// embedded: (true)|false
// detached: (false)|true
// collection: custom collection type (or object|index depending...)
// query: any additional data for non-embedded fetching
// path: for detached relationships
// as: for indexed associations
// startAt/endAt/limit for filtering
// key: (type)


})();

(function() {

var get = Ember.get;

FP.Utils = FP.Utils || {};
FP.Utils.expandPath = function(path, opts) {
  return path.replace(/{{([^}]+)}}/g, function(match, optName){
    var value = get(opts, optName);
    Ember.assert("Missing part for path expansion, looking for "+optName+" in "+Ember.inspect(opts) + " for "+path, value);
    return value;
  });
};

})();

(function() {

var get        = Ember.get,
    isNone     = Ember.isNone,
    expandPath = FP.Utils.expandPath;

FP.hasMany = function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = undefined;
  }

  options = options || {};

  if (options.embedded === undefined) {
    options.embedded = true;
  }

  var meta = {
    type:           type,
    isRelationship: true,
    kind:           'hasMany',
    options:        options
  };

  return Ember.computed(function(name, value) {
    var content, childSnap;

    if (arguments.length > 1) {
      if (isNone(value)) {
        return null;
      }
      content = value;
    } else if (!options.detached) {
      var dataKey   = this.relationshipKeyFromName(name),
          snapshot  = get(this, "snapshot");

      // collections use an actual snapshot, not a MutableSnapshot
      // TODO - should be able to pass the mutable one?
      childSnap = snapshot.child(dataKey).snapshot;
    }

    // regardless of getting or setting, we create a new collection
    // TODO - update the old one if there is one hanging around

    // TODO - use store.findQuery for this

    var store          = get(this, "store"),
        container      = get(this, "container"),
        collectionName = options.collection || (options.embedded ? "object" : "indexed"),
        collectionType = container.lookupFactory("collection:"+collectionName),
        query          = options.query;

    Ember.assert("Collection type must exist: "+collectionName, !!collectionType);

    if (typeof query === "function") {
      query = query.call(this);
    }

    var collectionOpts = {
      content:   content,
      store:     store,
      model:     meta.type,
      query:     query,
      as:        options.as,

      // TODO - allow these to be functions?
      startAt:   options.startAt,
      endAt:     options.endAt,
      limit:     options.limit
    };

    if (!options.detached) {
      collectionOpts.parent    = this;
      collectionOpts.parentKey = name;
      collectionOpts.snapshot  = childSnap;
    } else {
      var modelClass = store.modelFor(meta.type),
          reference;

      if (options.path) {
        var path = options.path;
        if (typeof path === "function") {
          path = path.call(this);
        } else {
          path = expandPath(path, this);
        }
        reference = modelClass.buildFirebaseRootReference(store).child(path);
      } else {
        reference = modelClass.buildFirebaseReference(store, query);
      }
      collectionOpts.firebaseReference = reference;
    }

    value = collectionType.create(collectionOpts);

    if (get(this, "isListeningToFirebase") && arguments.length === 1) {
      value.listenToFirebase();
    }

    return value;
  }).property().meta(meta);
};

})();

(function() {

// options
// embedded: (true)|false
// detached: (false)|true
// query: any additional data for non-embedded fetching
// id: for detached queries, defaults to the object ID
// key: (type)

var get    = Ember.get,
    isNone = Ember.isNone;

FP.hasOne = function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = undefined;
  }

  options = options || {};

  if (options.embedded === undefined && !options.detached) {
    options.embedded = true;
  }

  Ember.assert("can't be both detached and embedded", !options.detached || !options.embedded);

  var meta = {
    type:           type,
    isRelationship: true,
    kind:           'hasOne',
    options:        options
  };

  return Ember.computed(function(name, value) {
    if (arguments.length > 1) {
      if (isNone(value)) {
        return null;
      }

      if (options.embedded) {
        value.setProperties({
          parent:    this,
          parentKey: name
        });
      }

      return value;
    } else {
      var store    = get(this, "store"),
          snapshot = get(this, "snapshot"),
          childSnap;

      if (!options.detached) {
        var dataKey = this.relationshipKeyFromName(name);
        childSnap = snapshot.child(dataKey);
        if (!childSnap.val()) { return null; }
      }

      if (options.embedded) {
        value = store.createRecord(meta.type, {
          snapshot:  childSnap,
          parent:    this,
          parentKey: name
        });

        if (get(this, "isListeningToFirebase")) {
          value.listenToFirebase();
        }

        return value;
      } else {
        var itemID;

        if (options.detached) {
          itemID = options.id || get(this, "id");
          if (typeof itemID === "function") {
            itemID = itemID.call(this);
          }
        } else {
          itemID = childSnap.val();
          if (!itemID) { return null; }
        }

        var query = options.query;
        if (typeof query === "function") {
          query = query.call(this);
        }
        return store.findOne(meta.type, itemID, query);
      }
    }
  }).property().meta(meta);
};

})();

(function() {

FP.Transform = Ember.Object.extend({
  serialize:   Ember.required(),
  deserialize: Ember.required()
});

FP.Transform.reopenClass({
  deserialize: function(obj, value, meta, container) {
    return FP.Transform.transform("deserialize", obj, value, meta, container);
  },

  serialize: function(obj, value, meta, container) {
    return FP.Transform.transform("serialize", obj, value, meta, container);
  },

  transform: function(kind, obj, value, meta, container) {
    var type    = meta.type;
    var options = meta.options;

    if (options[kind]) {
      return options[kind].call(obj, value);
    }

    if (!type || !container) {
      return value;
    }

    var transform = container.lookup('transform:'+type);
    if (!transform) {
      return value;
    }

    return transform[kind](value, options, container);
  }
});


})();

(function() {

var none = Ember.isNone;

FP.StringTransform = FP.Transform.extend({

  deserialize: function(serialized) {
    return none(serialized) ? null : String(serialized);
  },

  serialize: function(deserialized) {
    return none(deserialized) ? null : String(deserialized);
  }

});

})();

(function() {

FP.BooleanTransform = FP.Transform.extend({
  deserialize: function(serialized) {
    return Boolean(serialized);
  },

  serialize: function(deserialized) {
    return Boolean(deserialized);
  }
});


})();

(function() {

/**
  Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>

  © 2011 Colin Snover <http://zetafleet.com>

  Released under MIT license.

  @class Date
  @namespace Ember
  @static
*/
Ember.Date = Ember.Date || {};

var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];

/**
  @method parse
  @param date
*/
Ember.Date.parse = function (date) {
    var timestamp, struct, minutesOffset = 0;

    // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
    // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
    // implementations could be faster
    //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
    if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
        // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
        for (var i = 0, k; (k = numericKeys[i]); ++i) {
            struct[k] = +struct[k] || 0;
        }

        // allow undefined days and months
        struct[2] = (+struct[2] || 1) - 1;
        struct[3] = +struct[3] || 1;

        if (struct[8] !== 'Z' && struct[9] !== undefined) {
            minutesOffset = struct[10] * 60 + struct[11];

            if (struct[9] === '+') {
                minutesOffset = 0 - minutesOffset;
            }
        }

        timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
    }
    else {
        timestamp = origParse ? origParse(date) : NaN;
    }

    return timestamp;
};

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Date) {
  Date.parse = Ember.Date.parse;
}


})();

(function() {

FP.DateTransform = FP.Transform.extend({
  deserialize: function(value) {
    if (!value || typeof value !== "string") {
      return null;
    }
    return new Date(Ember.Date.parse(value));
  },

  serialize: function(value) {
    if (!value || !value.toISOString) {
      return null;
    }
    return value.toISOString();
  }
});

})();

(function() {

FP.HashTransform = FP.Transform.extend({
  serialize: function(hash, options, container) {
    return transformHash("serialize", hash, options, container);
  },

  deserialize: function(hash, options, container) {
    return transformHash("deserialize", hash, options, container);
  }
});

function transformHash(direction, hash, options, container) {
  if (!hash) {
    return null;
  }

  if (!options || !options.of) {
    return hash;
  }

  var transform = container.lookup('transform:'+options.of);

  var transformed = {}, key, value;
  for (key in hash) {
    transformed[key] = transform[direction](hash[key], options, container);
  }
  return transformed;
}

})();

(function() {

var empty = Ember.isEmpty;

FP.NumberTransform = FP.Transform.extend({

  deserialize: function(serialized) {
    return empty(serialized) ? null : Number(serialized);
  },

  serialize: function(deserialized) {
    return empty(deserialized) ? null : Number(deserialized);
  }
});

})();

(function() {

FP.TimestampTransform = FP.Transform.extend({
  deserialize: function(value) {
    if (!value) {
      return null;
    }
    return new Date(value);
  },

  serialize: function(value) {
    if (!value || !value.getTime) {
      return null;
    }
    return value.getTime();
  }
});

})();

(function() {

var get        = Ember.get,
    deserialize= FP.Transform.deserialize,
    isNone     = Ember.isNone;

FP.attr = function(type, options) {
  if (arguments.length === 1 && typeof type === "object") {
    options = type;
    type    = 'string';
  }

  options = options || {};

  var meta = {
    type:        type,
    isAttribute: true,
    options:     options
  };

  return Ember.computed(function(name, value) {
    var container = get(this, 'container');
    if (arguments.length > 1) {
      if (isNone(value)) {
        value = getDefaultValue(this, options);
      }
      return value;
    }

    var dataKey  = this.attributeKeyFromName(name),
        snapshot = get(this, 'snapshot');

    value = snapshot.child(dataKey).val();

    if (isNone(value)) {
      value = getDefaultValue(this, options);
    } else {
      value = deserialize(this, value, meta, container);
    }

    return value;
  }).property().meta(meta);
};

function getDefaultValue(obj, options) {
  if (typeof options.default === 'function') {
    return options.default.call(obj);
  } else {
    return options.default;
  }
}

})();

(function() {

var get        = Ember.get,
    underscore = Ember.String.underscore,
    singularize= Ember.String.singularize;

FP.RelationshipsClassMixin = Ember.Mixin.create({
  relationships: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        meta.name = name;
        meta.key  = keyForRelationship(name, meta);
        meta.type = typeForRelationship(name, meta);
        map.set(name, meta);
      }
    });

    return map;
  }),

  relationshipsByKey: Ember.computed(function() {
    var map = Ember.Map.create(), key;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isRelationship) {
        meta.name = name;
        meta.key  = key = keyForRelationship(name, meta);
        meta.type = typeForRelationship(name, meta);
        map.set(key, meta);
      }
    });

    return map;
  }),

  relationshipNameFromKey: function(key) {
    var meta = get(this, 'relationshipsByKey').get(key);
    return meta && meta.name;
  },

  relationshipKeyFromName: function(name) {
    var meta = get(this, 'relationships').get(name);
    return meta && meta.key;
  }
});

FP.RelationshipsMixin = Ember.Mixin.create({
  relationshipNameFromKey: function(key) {
    return this.constructor.relationshipNameFromKey(key);
  },

  relationshipKeyFromName: function(name) {
    return this.constructor.relationshipKeyFromName(name);
  }
});

function keyForRelationship(name, meta) {
  if (meta && meta.options.key) {
    return meta.options.key;
  } else {
    return underscore(name);
  }
}

function typeForRelationship(name, meta) {
  var type = meta.type;

  if (!type && meta.kind === 'hasMany') {
    type = singularize(name);
  } else if (!type) {
    type = name;
  }

  return type;
}

})();

(function() {

var get = Ember.get,
    set = Ember.set,
    classify = Ember.String.classify;

FP.LiveMixin = Ember.Mixin.create(Ember.Evented, {
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

})();

(function() {

var get        = Ember.get,
    underscore = Ember.String.underscore;

FP.AttributesClassMixin = Ember.Mixin.create({
  attributes: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute) {
        meta.name = name;
        meta.key  = keyForAttribute(name, meta);
        map.set(name, meta);
      }
    });

    return map;
  }),

  attributesByKey: Ember.computed(function(){
    var map = Ember.Map.create(), key;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute) {
        meta.name = name;
        meta.key  = key = keyForAttribute(name, meta);
        map.set(key, meta);
      }
    });

    return map;
  }),

  eachAttribute: function(callback, binding) {
    get(this, 'attributes').forEach(function(name, meta) {
      callback.call(binding, name, meta);
    }, binding);
  },

  attributeNameFromKey: function(key) {
    var meta = get(this, 'attributesByKey').get(key);
    return meta && meta.name;
  },

  attributeKeyFromName: function(name) {
    var meta = get(this, 'attributes').get(name);
    return meta && meta.key;
  }
});

FP.AttributesMixin = Ember.Mixin.create({
  eachAttribute: function(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
  },

  attributeNameFromKey: function(key) {
    return this.constructor.attributeNameFromKey(key);
  },

  attributeKeyFromName: function(key) {
    return this.constructor.attributeKeyFromName(key);
  }
});

function keyForAttribute(name, meta) {
  if (meta && meta.options.key) {
    return meta.options.key;
  } else {
    return underscore(name);
  }
}

})();

(function() {

FP.MutableSnapshot = function(snapshot) {
  this.snapshot = snapshot;
  this.children = {};
};

FP.MutableSnapshot.prototype.name = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.name();
};

FP.MutableSnapshot.prototype.val = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.val();
};

FP.MutableSnapshot.prototype.getPriority = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.getPriority();
};

FP.MutableSnapshot.prototype.numChildren = function() {
  if (!this.snapshot) { return 0; }
  return this.snapshot.numChildren();
};

FP.MutableSnapshot.prototype.ref = function() {
  if (!this.snapshot) { return null; }
  return this.snapshot.ref();
};

FP.MutableSnapshot.prototype.setChild = function(key, snapshot) {
  this.children[key] = snapshot;
};

FP.MutableSnapshot.prototype.child = function(key) {
  var childSnapshot;
  if (this.children.hasOwnProperty(key)) {
    childSnapshot = this.children[key];
  } else if (this.snapshot) {
    childSnapshot = this.snapshot.child(key);
  }
  return new FP.MutableSnapshot(childSnapshot);
};


})();

(function() {

var get       = Ember.get,
    set       = Ember.set,
    cacheFor  = Ember.cacheFor,
    isNone    = Ember.isNone,
    serialize = FP.Transform.serialize;

FP.ModelClassMixin = Ember.Mixin.create(FP.AttributesClassMixin, FP.RelationshipsClassMixin);

FP.ModelMixin = Ember.Mixin.create(FP.LiveMixin, FP.AttributesMixin, FP.RelationshipsMixin, Ember.Evented, {
  firebaseEvents: ['child_added', 'child_removed', 'child_changed'],

  store: null,

  isNew: Ember.computed(function(){
    return !get(this, "_snapshot");
  }).property("_snapshot"),

  // the actual Firebase::Snapshot, can be null if new record
  _snapshot: null,

  // wrapped MutableSnapshot, will never be null
  snapshot: Ember.computed(function(key, value) {
    var snapshot;
    if (arguments.length > 1) {
      if (value instanceof FP.MutableSnapshot) {
        value = value.snapshot;
      }
      set(this, "_snapshot", value);
      snapshot = value;
    } else {
      snapshot = get(this, "_snapshot");
    }
    return new FP.MutableSnapshot(snapshot);
  }).property("_snapshot"),

  willDestroy: function() {
    var store = get(this, "store");
    store.teardownRecord(this);

    var parent = get(this, "parent"),
        parentKey = get(this, "parentKey");

    // TODO - remove this knowledge from here
    // Ember data does this with registered collections etc...
    if (parent && !parent.isDestroyed && !parent.isDestroying) {
      if (parent && parentKey) {
        set(parent, parentKey, null);
      } else {
        parent.removeObject(this);
      }
    }

    this._super();
  },

  eachActiveRelation: function(cb) {
    var item;
    get(this.constructor, 'relationships').forEach(function(name, meta) {
      item = cacheFor(this, name);
      if (item) { cb(item); }
    }, this);
  },

  listenToFirebase: function() {
    if (!get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(function(item) {
        item.listenToFirebase();
      });
    }
    return this._super();
  },

  stopListeningToFirebase: function() {
    if (get(this, 'isListeningToFirebase')) {
      this.eachActiveRelation(function(item) {
        item.stopListeningToFirebase();
      });
    }
    return this._super();
  },

  setAttributeFromSnapshot: function(snapshot, valueRemoved) {
    var key       = snapshot.name();
    var attribute = this.attributeNameFromKey(key);
    if (!attribute) { return; }

    var current     = get(this, "snapshot"),
        currentData = current.child(key).val(),
        newVal;

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      newVal   = null;
      snapshot = null;
    } else {
      newVal = snapshot.val();
    }

    // don't bother triggering a property change if nothing has changed
    // eg if we've got a snapshot & then started listening
    if (currentData === newVal) {
      return;
    }

    current.setChild(key, snapshot);

    this.settingFromFirebase(function(){
      this.notifyPropertyChange(attribute);
    });
  },

  notifyRelationshipOfChange: function(snapshot, valueRemoved) {
    var key       = snapshot.name();
    var attribute = this.relationshipNameFromKey(key);

    if (!attribute) { return; }

    // child_removed sends the old value back in the snapshot
    if (valueRemoved) {
      snapshot = null;
    }

    get(this, "snapshot").setChild(key, snapshot);

    var meta = this.constructor.metaForProperty(attribute);
    if (meta.kind === "hasOne") {
      this.settingFromFirebase(function(){
        this.notifyPropertyChange(attribute);
      });
    }
  },

  onFirebaseChildAdded: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseChildRemoved: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot, true);
    this.notifyRelationshipOfChange(snapshot, true);
  },

  onFirebaseChildChanged: function(snapshot) {
    this.setAttributeFromSnapshot(snapshot);
    this.notifyRelationshipOfChange(snapshot);
  },

  onFirebaseValue: function(snapshot) {
    // apparently we don't exist
    if (snapshot && !snapshot.val()) {
      this.destroy();
    } else {
      set(this, "_snapshot", snapshot);
    }
  },

  update: function(key, value) {
    set(this, key, value);
    return this.save(key);
  },

  save: function(key) {
    return get(this, 'store').saveRecord(this, key);
  },

  delete: function() {
    return get(this, 'store').deleteRecord(this);
  },

  toFirebaseJSON: function(includePriority) {
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships'),
        container     = get(this, "container"),
        snapshot      = get(this, "_snapshot"),
        json          = {},
        key, value;

    attributes.forEach(function(name, meta){
      value = get(this, name);
      // Firebase doesn't like null values, so remove them
      if (isNone(value)) { return; }

      json[this.attributeKeyFromName(name)] = serialize(this, value, meta, container);
    }, this);

    relationships.forEach(function(name, meta){
      // we don't serialize detached relationships
      if (meta.options.detached) { return; }

      key = this.relationshipKeyFromName(name);

      // if we haven't loaded the relationship yet, get the data from the snapshot
      // no point materializing something we already know the data of
      value = cacheFor(this, name);

      if (value === undefined && snapshot) {
        value = snapshot.child(key).exportVal();
      } else if (isNone(value)) {
        // Firebase doesn't like null values, so remove them
        return;
      } else {
        // TODO - ideally we shouldn't have to know about these details here
        // can we farm this off to a function on the relationship?
        if (meta.kind === "hasOne" && meta.options.embedded === false) {
          value = get(value, "id");
        } else {
          value = value.toFirebaseJSON(true);
        }
      }

      json[key] = value;
    }, this);

    return includePriority ? this.wrapValueAndPriority(json) : json;
  },

  wrapValueAndPriority: function(json) {
    var priority = get(this, 'priority');
    if (isNone(priority)) {
      return json;
    }

    return {
      '.value':    json,
      '.priority': priority
    };
  }

});

})();

(function() {

var get        = Ember.get,
    expandPath = FP.Utils.expandPath;

FP.Model = Ember.Object.extend(FP.ModelMixin, {
  id: function(key, value) {
    if (value) { return value; }

    var store = get(this, 'store');
    return this.constructor.buildFirebaseRootReference(store).push().name();
  }.property(),

  debugReference: function(){
    return this.buildFirebaseReference().toString();
  }.property(),

  buildFirebaseReference: function(){
    var id        = get(this, 'id'),
        parent    = get(this, 'parent'),
        parentKey = get(this, 'parentKey'),
        ref;

    if (parent && parentKey) {
      var childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    if (parent) {
      ref = parent.buildFirebaseReference();
    } else {
      var store = get(this, 'store');
      ref = this.constructor.buildFirebaseReference(store, this);
    }

    return ref.child(id);
  }
});

FP.Model.reopenClass(FP.ModelClassMixin, {
  firebasePath: function(){
    Ember.assert('ember-inflector not found, install or manually set firebasePath references', Ember.String.pluralize);
    var className = this.toString().split('.').pop();
    return Ember.String.pluralize(Ember.String.underscore(className));
  },

  // override for polymophism
  typeFromSnapshot: function(snapshot) {
    return this;
  },

  // defaults to the store's root reference, normally won't be overridden
  // unless you have a different firebase per model, which could cause oddness!
  buildFirebaseRootReference: function(store) {
    return store.buildFirebaseRootReference();
  },

  buildFirebaseReference: function(store, opts){
    opts = opts || {};

    var path = this.firebasePath;
    if (typeof path === "function") {
      // so firebase path  can do opts.get("...") regardless of being passed hash or model instance
      if (!(opts instanceof Ember.Object)) {
        opts = Ember.Object.create(opts);
      }
      path = path.call(this, opts);
    } else if (typeof path === "string") {
      path = expandPath(path, opts);
    }

    if (path instanceof Firebase) {
      return path;
    }

    var root = this.buildFirebaseRootReference(store);
    return root.child(path);
  }
});

})();

(function() {

var get = Ember.get,
    set = Ember.set,
    getProperties = Ember.getProperties;

FP.Collection = Ember.ArrayProxy.extend(FP.LiveMixin, {
  firebaseEvents: ['child_added', 'child_removed', 'child_moved'],

  model:     null,
  parent:    null,
  parentKey: null,
  snapshot:  null,
  query:     null,

  // filtering
  startAt: null,
  endAt:   null,
  limit:   null,

  onFirebaseChildAdded:   Ember.required,
  onFirebaseChildRemoved: Ember.required,
  onFirebaseChildMoved:   Ember.required,
  toFirebaseJSON:         Ember.required,

  isNew: Ember.computed(function(){
    return !get(this, "snapshot");
  }).property("snapshot"),

  firebaseReference: null,

  debugReference: function(){
    return this.buildFirebaseReference().toString();
  }.property(),

  buildFirebaseReference: function() {
    // do we have an explicit reference?
    var ref = get(this, 'firebaseReference');
    if (ref) {
      return ref;
    }

    // do we have an explicit path to build from?
    var path  = get(this, 'firebasePath'),
        store = get(this, 'store');

    if (path) {
      var rootRef = store.buildFirebaseRootReference();
      return rootRef.child(path);
    }

    // are we an embedded collection in a relationship?
    var parent    = get(this, 'parent'),
        parentKey = get(this, 'parentKey');

    if (parent && parentKey) {
      var childKey = parent.relationshipKeyFromName(parentKey);
      return parent.buildFirebaseReference().child(childKey);
    }

    // otherwise we're a root collection, use the model reference
    var modelName  = get(this, 'model'),
        modelClass = store.modelFor(modelName);

    return modelClass.buildFirebaseReference(store);
  },

  buildFirebaseQuery: function() {
    var reference = this.buildFirebaseReference(),
        options = getProperties(this, 'startAt', 'endAt', 'limit');

    if (options.startAt) {
      reference = reference.startAt(options.startAt);
    }

    if (options.endAt) {
      reference = reference.endAt(options.endAt);
    }

    if (options.limit) {
      reference = reference.limit(options.limit);
    }

    return reference;
  },

  modelClassFromSnapshot: function(snap) {
    var modelName = get(this, 'model');
    var baseClass = this.store.modelFor(modelName);
    return baseClass.typeFromSnapshot(snap);
  },

  onFirebaseValue: function(snapshot) {
    set(this, "snapshot", snapshot);
  },

  setupContent: Ember.on('init', function() {
    if (!get(this, 'content')) {
      set(this, 'content', []);
    }
  }),

  insertAfter: function(prevItemName, item, collection) {
    collection = collection || this;

    var previous, previousIndex;
    if (prevItemName) {
      previous = collection.findProperty('id', prevItemName);
      if (previous) {
        previousIndex = collection.indexOf(previous);
        collection.insertAt(previousIndex + 1, item);
      } else {
        collection.pushObject(item);
      }
    } else {
      collection.unshiftObject(item);
    }
  }

});

})();

(function() {

var get = Ember.get,
    set = Ember.set;

FP.ObjectCollection = FP.Collection.extend({

  toFirebaseJSON: function() {
    return this.reduce(function(json, item) {
      json[get(item, 'id')] = item.toFirebaseJSON(true);
      return json;
    }, {});
  },

  // If we start listening straight after initializing then this is redundant
  // as all the data gets sent in onFirebaseChildAdded anyway
  // but we don't know if we're going to be live or not in the near future
  // so inflate if we have a snapshot
  inflateFromSnapshot: Ember.on("init", function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot) { return; }

    var content = [], _this = this;
    snapshot.forEach(function(child) {
      content.push(_this.modelFromSnapshot(child));
    });
    set(this, "content", content);
  }),

  // if we're listening, then our existing children should be too
  listenToFirebase: function() {
    this.invoke("listenToFirebase");
    return this._super();
  },

  stopListeningToFirebase: function() {
    this.invoke("stopListeningToFirebase");
    return this._super();
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    this.setupParentage(objectsAdded);
    return this._super(start, numRemoved, objectsAdded);
  },

  hasLoadedAllChildren: function() {
    var snapshot = get(this, "snapshot");
    return snapshot && snapshot.numChildren() === get(this, "length");
  }.property("length", "snapshot"),

  // WIP - experimental & untested
  fetch: function() {
    if (get(this, "hasLoadedAllChildren")) {
      return Ember.RSVP.resolve(this);
    }

    var _this = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var observerFunc = function() {
        if (get(_this, "hasLoadedAllChildren")) {
          _this.removeObserver("hasLoadedAllChildren", _this, observerFunc);
          resolve(_this);
        }
      };

      _this.addObserver("hasLoadedAllChildren", _this, observerFunc);

      // TODO - how do we know if this fails?
      // should we have a private promise / var somewhere to know the status?
      // or maybe listenToFirebase returns a promise against on("value")?
      if (!get(this, "isListeningToFirebase")) {
        _this.listenToFirebase();
      }
    });
  },

  contentChanged: function() {
    this.setupParentage(this);
  }.observes("content").on("init"),

  setupParentage: function(items) {
    items.forEach(function(item) {
      item.setProperties({
        parent:    this,
        parentKey: null
      });
    }, this);
  },

  modelFromSnapshot: function(snapshot) {
    var id        = snapshot.name(),
        modelName = this.modelClassFromSnapshot(snapshot),
        store     = get(this, 'store'),
        query     = get(this, 'query') || {};

    return store.findInCacheOrCreateRecord(modelName, snapshot.ref(), Ember.merge({
      snapshot: snapshot,
      priority: snapshot.getPriority()
    }, query));
  },

  // TODO / OPTIMIZE - faster way of checking for existing inclusion instead of findBy("id") each check
  // on replaceContent we can build an ID map and then check that

  onFirebaseChildAdded: function(snapshot, prevItemName) {
    var id = snapshot.name();

    if (this.findBy('id', id)) { return; }

    var obj = this.modelFromSnapshot(snapshot);
    this.insertAfter(prevItemName, obj);

    // this needs to happen after insert, otherwise the parent isn't associated yet
    // and the reference is incorrect
    obj.listenToFirebase();
  },

  // TODO - should we destroy the item when removed?
  // TODO - should the item be removed from the store's cache?
  onFirebaseChildRemoved: function(snapshot) {
    var item = this.findBy('id', snapshot.name());
    if (!item) { return; }
    this.removeObject(item);
    item.stopListeningToFirebase();
  },

  onFirebaseChildMoved: function(snapshot, prevItemName) {
    var item = this.findBy('id', snapshot.name());
    if (!item) { return; }

    this.removeObject(item);
    set(item, 'priority', snapshot.getPriority());
    this.insertAfter(prevItemName, item);
  }

});

})();

(function() {

var get    = Ember.get,
    isNone = Ember.isNone;

FP.MetaModel = Ember.ObjectProxy.extend(FP.ModelMixin, {
  id:        Ember.computed.alias('content.id'),
  priority:  null,
  parent:    null,
  parentKey: null,

  // meta is the simple value of the snapshot
  // if attributes are defined then you can't also have a meta value
  meta: Ember.computed(function(key, value){
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships');

    if (attributes.length || relationships.length) {
      return null;
    }

    if (arguments.length > 1) {
      return value;
    } else {
      return get(this, "snapshot").val();
    }
  }).property("snapshot"),

  buildFirebaseReference: function(){
    var id        = get(this, 'id'),
        parent    = get(this, 'parent');

    Ember.assert("meta models must belong to a parent in order to generate a Firebase reference", parent);

    return parent.buildFirebaseReference().child(id);
  },

  toFirebaseJSON: function(includePriority) {
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships');

    if (attributes.length || relationships.length) {
      var attrJSON = this._super(includePriority);

      // if attributes are null, then we'll get an empty object back
      // we don't want to save this as that'll be treated as deleting the meta model!
      if (!jQuery.isEmptyObject(attrJSON)) {
        return attrJSON;
      }
    }

    var meta = get(this, "meta");
    if (isNone(meta)) {
      meta = true;
    }

    if (includePriority) {
      return this.wrapValueAndPriority(meta);
    } else {
      return meta;
    }
  },

  saveContent: function() {
    return this.get("content").save();
  },

  changeCameFromFirebase: function() {
    if (!!this._settingFromFirebase) {
      return true;
    } else if (get(this, "content.changeCameFromFirebase")) {
      return true;
    } else {
      return false;
    }
  }.property().volatile()

});

FP.MetaModel.reopenClass(FP.ModelClassMixin);

})();

(function() {

var get = Ember.get,
    set = Ember.set;

FP.IndexedCollection = FP.Collection.extend({

  firebaseEvents: "child_changed",

  as: null, // the meta model wrapper to use

  toFirebaseJSON: function() {
    var value;
    return this.reduce(function(json, item) {
      if (item instanceof FP.MetaModel) {
        value = item.toFirebaseJSON(true);
      } else {
        value = true;
      }
      json[get(item, 'id')] = value;
      return json;
    }, {});
  },

  // If we start listening straight after initializing then this is redundant
  // as all the data gets sent in onFirebaseChildAdded anyway
  // but we don't know if we're going to be live or not in the near future
  // so inflate if we have a snapshot
  inflateFromSnapshot: Ember.on("init", function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot) { return; }

    var content = [], _this = this;
    snapshot.forEach(function(child) {
      content.push(_this.itemFromSnapshot(child));
    });
    set(this, "content", content);
  }),

  contentChanged: function() {
    if (this._updatingContent) { return; }

    var content = get(this, "content");
    if (!content) { return; }

    var anyTransformed = false;
    var transformed = content.map(function(item){
      if (item instanceof Ember.Object) {
        item = this.itemFromRecord(item);
        anyTransformed = true;
      }
      return item;
    }, this);

    if (anyTransformed) {
      this._updatingContent = true;
      set(this, "content", transformed);
      this._updatingContent = false;
    }
  }.observes("content").on("init"),

  // if we're listening, then our meta model items should be too
  listenToFirebase: function() {
    if (get(this, "as")) {
      this.invoke("listenToFirebase");
    }
    return this._super();
  },

  stopListeningToFirebase: function() {
    if (get(this, "as")) {
      this.invoke("stopListeningToFirebase");
    }
    return this._super();
  },

  hasLoadedAllChildren: function() {
    var snapshot = get(this, "snapshot");
    if (!snapshot || snapshot.numChildren() !== get(this, "length")) { return false; }

    // we go through content instead of this.forEach as that would issue finds for all unloaded items
    var content = get(this, "content");

    // we've loaded all children if every item has a record object
    return content.every(function(item) { return !!item.record; });
  }.property("length", "snapshot"),

  // WIP - experimental & untested
  fetch: function() {
    if (get(this, "hasLoadedAllChildren")) {
      return Ember.RSVP.resolve(this);
    }

    var _this = this;
    return this.listenToFirebase().then(function() {
      var content  = get(_this, "content");
      var promises = content.map(function(item, index){
        return _this.objectAtContentAsPromise(index);
      });
      return Ember.RSVP.all(promises);
    }).then(function() {
      return _this;
    });
  },

  itemFromSnapshot: function(snapshot) {
    return {
      id:       snapshot.name(),
      snapshot: snapshot,
      record:   null
    };
  },

  itemFromRecord: function(record) {
    return {
      id:       get(record, 'id'),
      snapshot: null,
      record:   this.wrapRecordInMetaObjectIfNeccessary(record)
    };
  },

  replaceContent: function(start, numRemoved, objectsAdded) {
    objectsAdded = objectsAdded.map(function(object) {
      if (object instanceof FP.MetaModel) {
        object.set("parent", this);
        return this.itemFromRecord(object);
      } else if (object instanceof Ember.Object) {
        return this.itemFromRecord(object);
      } else {
        return object;
      }
    }, this);
    return this._super(start, numRemoved, objectsAdded);
  },

  // TODO - can we replace this with objectAtContentAsPromise and always use fetch somehow?
  objectAtContent: function(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return;
    }

    var item = content.objectAt(idx);
    if (!item) {
      return;
    }

    // already inflated
    if (item.record) {
      return item.record;
    }

    item.record = this.findFetchRecordFromItem(item, false);

    return item.record;
  },

  objectAtContentAsPromise: function(idx) {
    var content = get(this, "content");
    if (!content || !content.length) {
      return Ember.RSVP.reject();
    }

    var item = content.objectAt(idx);
    if (!item) {
      return Ember.RSVP.reject();
    }

    // already inflated
    if (item.record) {
      return Ember.RSVP.resolve(item.record);
    }

    var recordPromise = this.findFetchRecordFromItem(item, true);
    return recordPromise.then(function(record) {
      item.record = record;
      return item.record;
    });
  },

  // TODO - handle findOne failing (permissions / 404)
  findFetchRecordFromItem: function(item, returnPromise) {
    var store  = get(this, "store"),
        query  = get(this, "query"),
        type   = this.modelClassFromSnapshot(item.snapshot),
        _this  = this,
        record;

    if (returnPromise) {
      record = store.fetchOne(type, item.id, query);
      return record.then(function(resolved) {
        return _this.wrapRecordInMetaObjectIfNeccessary(resolved, item.snapshot);
      });
    } else {
      record = store.findOne(type, item.id, query);
      return this.wrapRecordInMetaObjectIfNeccessary(record, item.snapshot);
    }
  },

  wrapRecordInMetaObjectIfNeccessary: function(record, snapshot) {
    var as = get(this, "as");
    if (!as || record instanceof FP.MetaModel) {
      return record;
    }

    var store    = get(this, "store"),
        priority = snapshot ? snapshot.getPriority() : null;

    var meta = store.buildRecord(as, null, {
      content:  record,
      priority: priority,
      snapshot: snapshot,
      parent:   this
    });

    if (snapshot) {
      meta.listenToFirebase();
    }
    return meta;
  },

  onFirebaseChildAdded: function(snapshot, prevItemName) {
    var id      = snapshot.name(),
        content = get(this, "content");

    if (content.findBy('id', id)) { return; }

    var item = this.itemFromSnapshot(snapshot);
    this.insertAfter(prevItemName, item, content);
  },

  onFirebaseChildRemoved: function(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    content.removeObject(item);
  },

  onFirebaseChildMoved: function(snapshot, prevItemName) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    content.removeObject(item);

    // only set priority on the meta-model, otherwise we'd nuke the priority
    // on the underlying record which exists elsewhere in the tree and could have
    // its own priority
    if (get(this, "as") && item.record) {
      set(item.record, 'priority', snapshot.getPriority());
    }

    this.insertAfter(prevItemName, item, content);
  },

  // if the child changed then its meta information has changed
  // if we're polymorphic this means we'll need to fetch a new content item
  // otherwise the meta model will take care of it
  // currently this replaces the item each time, but we should only need to do this
  // when polymorphic and the polymorph key has changed - but we don't currently
  // know what that is
  // TODO - add polymorphic: true/key as an option where key defaults to 'type'
  onFirebaseChildChanged: function(snapshot) {
    var content = get(this, "content"),
        item    = content.findBy('id', snapshot.name());

    if (!item) { return; }

    // item.snapshot = snapshot;

    // TODO - only do this if polymorphic and the polymorph key has changed
    // otherwise just update the snapshot
    var index   = content.indexOf(item),
        newItem = this.itemFromSnapshot(snapshot);

    content.replace(index, 1, [newItem]);
  }

});

})();

(function() {

var set = Ember.set,
    get = Ember.get,
    resolve = Ember.RSVP.resolve;

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


})();

(function() {

// handles running multiple firebase events in the same run-loop

var classify = Ember.String.classify;

FP.FirebaseEventQueue = function() {
  this.pending = [];
};

FP.FirebaseEventQueue.prototype = {
  enqueue: function(fn, context) {
    this.pending.push([fn, context]);

    if (!this.running) {
      this.running = true;
      // TODO - running in the next runloop breaks the tests
      // how to solve this without this hack?
      var run = Ember.testing ? Ember.run : Ember.run.next;
      run(this, this.flush);
    }
  },

  flush: function() {
    var batch;

    // if a batch queues items itself we want to make sure we run those too
    // otherwise they'll be ignored
    while (this.pending.length) {
      batch = this.pending;
      this.pending = [];
      this.runBatch(batch);
    }

    this.running = false;
  },

  runBatch: function(batch) {
    var context, fn;

    batch.forEach(function(item){
      fn      = item[0];
      context = item[1];
      fn.call(context);
    });
  }
};


})();

(function() {

var get     = Ember.get,
    set     = Ember.set,
    guidFor = Ember.guidFor;

FP.Store = Ember.Object.extend({

  firebaseRoot: null,

  init: function() {
    this._super();
    this.clearCache();
    this.queue = new FP.FirebaseEventQueue();
  },

  enqueueEvent: function(context, fn) {
    this.queue.enqueue(context, fn);
  },

  // just returns a new instance of the same store with the same container
  // means the cache is isolated & any finds etc are operating
  // independently of the forked store.
  // no need to re-join, just save or discard your changes & firebase
  // takes care of keeping the other models in sync
  fork: function() {
    return this.constructor.create({
      container: get(this, "container")
    });
  },

  buildFirebaseRootReference: function(){
    var url = get(this, 'firebaseRoot');
    Ember.assert("Your store needs a firebaseRoot", url);
    if (url instanceof Firebase) {
      return url;
    }
    return new Firebase(url);
  },

  createRecord: function(type, attributes) {
    attributes = attributes || {};
    var record = this.buildRecord(type, attributes.id, attributes);
    this.storeInCache(type, record);
    return record;
  },

  saveRecord: function(record, attr) {
    var ref      = record.buildFirebaseReference();
    var priority = get(record, 'priority');
    var json     = record.toFirebaseJSON();
    var _this    = this;

    record.trigger("save");

    return new Ember.RSVP.Promise(function(resolve, reject){
      var callback = function(error) {
        _this.enqueueEvent(function(){
          if (error) {
            reject(error);
          } else if (get(record, "isDeleted") || get(record, "isDeleting")) { // it was deleted in the time it took to save
            reject("the record has since been deleted");
          } else {
            if (!attr) {
              _this.storeInCache(record.constructor, record);
            }
            record.listenToFirebase();
            resolve(record);
            record.trigger("saved");
          }
        });
      };

      if (attr) {
        if (attr !== 'priority') {
          var key = record.attributeKeyFromName(attr) || record.relationshipKeyFromName(attr);

          Ember.assert(Ember.inspect(record) +" has no attribute "+ attr, key);

          var value = json[key];
          if (value) {
            ref.child(key).set(value, callback);
          } else {
            ref.child(key).remove(callback);
          }
        } else {
          ref.setPriority(priority, callback);
        }
      } else {
        if (priority) {
          ref.setWithPriority(json, priority, callback);
        } else {
          ref.set(json, callback);
        }
      }
    }, "FP: Save "+ref.toString());
  },

  deleteRecord: function(record) {
    var ref         = record.buildFirebaseReference(),
        _this       = this,
        isListening = get(record, "isListeningToFirebase");

    record.trigger("delete");

    if (isListening) {
      record.stopListeningToFirebase();
    }

    return new Ember.RSVP.Promise(function(resolve, reject){
      ref.remove(function(error) {
        _this.enqueueEvent(function(){
          if (error) {
            if (isListening) { // the delete failed, start listening to changes again
              record.startListeningToFirebase();
            }
            reject(error);
          } else {
            resolve(record);
            record.trigger("deleted");
          }
        });
      });
    }, "FP: Delete "+ref.toString());
  },

  find: function(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.findAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.findQuery(type, idOrQuery, options);
    } else {
      return this.findOne(type, idOrQuery, options);
    }
  },

  fetch: function(type, idOrQuery, options) {
    if (arguments.length === 1) {
      return this.fetchAll(type);
    } else if (typeof idOrQuery === 'object') {
      return this.fetchQuery(type, idOrQuery, options);
    } else {
      return this.fetchOne(type, idOrQuery, options);
    }
  },

  findOne: function(type, id, query) {
    return this.findFetchOne(type, id, query, false);
  },

  fetchOne: function(type, id, query) {
    return this.findFetchOne(type, id, query, true);
  },

  findQuery: function(type, query, options) {
    return this.findFetchQuery(type, query, options, false);
  },

  fetchQuery: function(type, query, options) {
    return this.findFetchQuery(type, query, options, true);
  },

  findAll: function(type, query) {
    return this.findFetchQuery(type, query, {}, false);
  },

  fetchAll: function(type, query) {
    return this.findFetchQuery(type, query, {}, true);
  },

  findFetchQuery: function(type, query, options, returnPromise) {
    options = options || {};
    query   = query   || {};

    // switch order if query is the options
    if (query.startAt || query.endAt || query.limit || query.path || query.collection) {
      options = query;
      query   = {};
    }

    var model = this.modelFor(type),
        reference;

    if (options.path) {
      reference = model.buildFirebaseRootReference(this).child(options.path);
    } else {
      reference = model.buildFirebaseReference(this, query);
    }

    return this.findFetchCollectionByReference(model, reference, query, options, returnPromise);
  },

  findFetchOne: function(type, id, query, returnPromise) {
    query = query || {};

    var record   = this.buildRecord(type, id, query),
        ref      = record.buildFirebaseReference(),
        existing = this.findInCacheByReference(type, ref),
        promise;

    if (existing) {
      existing.listenToFirebase();
      promise = Ember.RSVP.resolve(existing);
      return returnPromise ? promise : FP.PromiseModel.create({content: existing, promise: promise});
    }

    var _this = this;

    promise = new Ember.RSVP.Promise(function(resolve, reject){
      ref.once('value', function(snapshot){
        _this.enqueueEvent(function(){
          var value = snapshot.val();
          if (value) {

            // for polymorhism
            var modelType = _this.modelFor(type).typeFromSnapshot(snapshot);
            record = _this.createRecord(modelType, Ember.merge(query, {
              id: id,
              snapshot: snapshot
            }));

            record.listenToFirebase();
            resolve(record);
          } else {
            reject('not found');
          }
        });
      }, function(){
        reject('permission denied');
      });
    }, "FP: Find one "+ref.toString());

    return returnPromise ? promise : FP.PromiseModel.create({promise: promise, content: record});
  },

  findFetchCollectionByReference: function(model, ref, query, options, returnPromise) {
    var container = get(this, 'container');

    var type    = options.collection || "object",
        factory = container.lookupFactory("collection:"+type),
        _this   = this,
        collection, promise, fbQuery;

    collection = factory.create({
      store: this,
      model: model,
      query: query,
      firebaseReference: ref,
      startAt: options.startAt,
      endAt: options.endAt,
      limit: options.limit
    });

    fbQuery = collection.buildFirebaseQuery();

    promise = new Ember.RSVP.Promise(function(resolve, reject){
      fbQuery.once('value', function(snapshot){
        _this.enqueueEvent(function(){
          // we don't reject if snapshot is empty, an empty collection is still valid
          set(collection, "snapshot", snapshot);
          collection.inflateFromSnapshot();
          collection.listenToFirebase();
          resolve(collection);
        });
      }, function(){
        reject('permission denied');
      });
    }, "FP: Find many "+fbQuery.toString());

    return returnPromise ? promise : collection;
  },

  modelFor: function(type) {
    var factory;

    if (typeof type === 'string') {
      factory = get(this, 'container').lookupFactory('model:' + type);
      Ember.assert("No model was found for '" + type + "'", factory);
    } else {
      factory = type;
    }
    return factory;
  },

  buildRecord: function(type, id, attributes) {
    var container = get(this, "container"),
        factory   = this.modelFor(type),
        record;

    record = factory.create({
      store:     this,
      container: container
    });

    if (attributes) {
      record.setProperties(attributes);
    }

    if (id) {
      record.set("id", id);
    }

    return record;
  },

  clearCache: function() {
    this.cache = {};
  },

  cacheForType: function(type) {
    var model = this.modelFor(type),
        guid  = guidFor(model),
        cache = this.cache[guid];

    if (cache) {
      return cache;
    }

    cache = {
      records:  {}
    };

    this.cache[guid] = cache;

    return cache;
  },

  storeInCache: function(type, record) {
    // don't bother caching meta models for now
    if (record instanceof FP.MetaModel) {
      return;
    }

    var cache = this.cacheForType(type),
        ref   = record.buildFirebaseReference().toString();

    cache.records[ref] = record;
  },

  // when record is destroyed, remove it from the cache etc...
  teardownRecord: function(record) {
    var cache = this.cacheForType(record.constructor),
        ref   = record.buildFirebaseReference().toString();

    delete cache.records[ref];
  },

  findInCacheByReference: function(type, reference) {
    var cache = this.cacheForType(type);
    return cache.records[reference.toString()];
  },

  findInCacheOrCreateRecord: function(type, reference, attributes) {
    var record = this.findInCacheByReference(type, reference);
    if (record) {
      return record;
    } else {
      attributes.id = reference.name();
      return this.createRecord(type, attributes);
    }
  },

  all: function(type) {
    var cache   = this.cacheForType(type),
        records = cache.records,
        all     = [],
        reference;

    for (reference in records) {
      all.push(records[reference]);
    }

    return all;
  }

});

})();

(function() {

if (!Ember.DataAdapter) { return; }

var get        = Ember.get,
    capitalize = Ember.String.capitalize,
    underscore = Ember.String.underscore;

FP.DebugAdapter = Ember.DataAdapter.extend({
  getFilters: function() {
    return [
      { name: 'isLive',     desc: 'Live'    },
      { name: 'isNew',      desc: 'New'     }
    ];
  },

  detect: function(klass) {
    return klass !== FP.Model && FP.Model.detect(klass);
  },

  columnsForType: function(type) {
    var columns = [{ name: 'id', desc: 'Id' }], count = 0, self = this;
    get(type, 'attributes').forEach(function(name, meta) {
        if (count++ > self.attributeLimit) { return false; }
        var desc = capitalize(underscore(name).replace('_', ' '));
        columns.push({ name: name, desc: desc });
    });
    columns.push({name: 'fbPath', desc: 'Firebase Path'});
    return columns;
  },

  getRecords: function(type) {
    return this.get('store').all(type);
  },

  recordReferenceToString: function(record) {
    var ref  = record.buildFirebaseReference(),
        root = ref.root().toString();

    return ref.toString().slice(root.length);
  },

  getRecordColumnValues: function(record) {
    var self  = this,
        count = 0;

    var columnValues = {
      id: get(record, 'id'),
      fbPath: this.recordReferenceToString(record)
    };

    record.eachAttribute(function(key) {
      if (count++ > self.attributeLimit) {
        return false;
      }
      var value = get(record, key);
      columnValues[key] = value;
    });
    return columnValues;
  },

  getRecordKeywords: function(record) {
    var keywords = [], keys = Ember.A(['id']);
    record.eachAttribute(function(key) {
      keys.push(key);
    });
    keys.forEach(function(key) {
      keywords.push(get(record, key));
    });
    return keywords;
  },

  getRecordFilterValues: function(record) {
    return {
      isLive:    record.get('isListeningToFirebase'),
      isNew:     record.get('isNew')
    };
  },

  getRecordColor: function(record) {
    var color = 'black';
    if (record.get('isListeningToFirebase')) {
      color = 'green';
    } else if (record.get('isNew')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord: function(record, recordUpdated) {
    var releaseMethods = Ember.A(), self = this,
        keysToObserve = Ember.A(['id', 'isListeningToFirebase', 'isNew']);

    record.eachAttribute(function(key) {
      keysToObserve.push(key);
    });

    keysToObserve.forEach(function(key) {
      var handler = function() {
        recordUpdated(self.wrapRecord(record));
      };
      Ember.addObserver(record, key, handler);
      releaseMethods.push(function() {
        Ember.removeObserver(record, key, handler);
      });
    });

    var release = function() {
      releaseMethods.forEach(function(fn) { fn(); } );
    };

    return release;
  }

});


})();

(function() {

Ember.onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'store',

    initialize: function(container, application) {
      application.register('store:main', application.Store || FP.Store);

      // Eagerly generate the store so defaultStore is populated.
      // TODO: Do this in a finisher hook
      container.lookup('store:main');
    }
  });

  Application.initializer({
    name: 'transforms',

    initialize: function(container, application) {
      application.register('transform:boolean',   FP.BooleanTransform);
      application.register('transform:date',      FP.DateTransform);
      application.register('transform:timestamp', FP.TimestampTransform);
      application.register('transform:number',    FP.NumberTransform);
      application.register('transform:hash',      FP.HashTransform);
      application.register('transform:string',    FP.StringTransform);
    }
  });

  Application.initializer({
    name: 'data-adapter',

    initialize: function(container, application) {
      application.register('data-adapter:main', FP.DebugAdapter);
    }
  });

  Application.initializer({
    name: 'collections',

    initialize: function(container, application) {
      application.register('collection:object',  FP.ObjectCollection);
      application.register('collection:indexed', FP.IndexedCollection);
    }
  });

  Application.initializer({
    name: 'injectStore',

    initialize: function(container, application) {
      application.inject('controller',  'store', 'store:main');
      application.inject('route',       'store', 'store:main');
      application.inject('data-adapter', 'store', 'store:main');
      application.inject('collection',  'store', 'store:main');
      application.inject('component',   'store', 'store:main');
    }
  });

});


})();