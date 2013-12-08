// options
// embedded: (true)|false
// detached: (false)|true
// query: any additional data for non-embedded fetching
// id: for detached queries, defaults to the object ID
// key: (type)

var get = Ember.get;

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
      if (value === null || value === undefined) {
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
          snapshot = get(this, "_snapshot"),
          childSnap;

      if (!options.detached) {
        var dataKey = this.relationshipKeyFromName(name);
        childSnap = snapshot && snapshot.child(dataKey);
        if (!(childSnap && childSnap.val())) { return null; }
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
            itemID = query.call(this);
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