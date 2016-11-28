import Ember from 'ember';

// options
// embedded: (true)|false
// detached: (false)|true
// query: any additional data for non-embedded fetching
// id:
//     for detached queries, defaults to the object ID
//     for embedded - include the ID in Firebase
// key: (type)

const get    = Ember.get;
const isNone = Ember.isNone;

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

  const meta = {
    type:           type,
    isRelationship: true,
    kind:           'hasOne',
    options:        options
  };

  return Ember.computed({
    get(name) {
      const store    = get(this, "store");
      const snapshot = get(this, "snapshot");

      let childSnap;

      if (!options.detached) {
        const dataKey = this.relationshipKeyFromName(name);
        childSnap = snapshot.child(dataKey);
        if (!childSnap.val()) { return null; }
      }

      if (options.embedded) {
        const attributes = {
          snapshot:  childSnap,
          parent:    this,
          parentKey: name
        };

        if (options.id) {
          attributes.id = childSnap.child("id").val();
        }

        const value = store.createRecord(meta.type, attributes);

        if (get(this, "isListeningToFirebase")) {
          value.listenToFirebase();
        }

        return value;
      } else {
        let itemID;
        if (options.detached) {
          itemID = options.id || get(this, "id");
          if (typeof itemID === "function") {
            itemID = itemID.call(this);
          }
        } else {
          itemID = childSnap.val();
          if (!itemID) { return null; }
        }

        let query = options.query;
        if (typeof query === "function") {
          query = query.call(this);
        }
        return store.findOne(meta.type, itemID, query);
      }
    },
    set(name, value) {
      if (isNone(value)) {
        return null;
      }

      if (options.embedded) {
        value.setProperties({
          parent:    this,
          parentKey: name
        });
      } else if (options.inverse) {
        Ember.RSVP.resolve(value).then(resolvedValue => {
          var inverseRelation = resolvedValue.constructor.metaForProperty(options.inverse);

          if (inverseRelation.kind === 'hasMany') {
            resolvedValue.get(options.inverse).addObject(this);
          } else if (inverseRelation.kind === 'hasOne') {
            resolvedValue.set(options.inverse, this);
          }
        });
      }

      return value;
    }
  }).meta(meta);
}
