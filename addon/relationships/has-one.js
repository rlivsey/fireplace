import Ember from 'ember';

// options
// embedded: (true)|false
// detached: (false)|true
// query: any additional data for non-embedded fetching
// id: for detached queries, defaults to the object ID
// key: (type)

var get    = Ember.get;
var isNone = Ember.isNone;

export default function(type, options) {
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
}