require('fireplace/model/model_mixin');

var get    = Ember.get,
    isNone = Ember.isNone;

FP.MetaModel = Ember.ObjectProxy.extend(FP.ModelMixin, {
  id:        Ember.computed.alias('content.id'),
  priority:  null,
  parent:    null,
  parentKey: null,

  // meta is just the entire value of the snapshot
  meta: Ember.computed(function(key, value){
    if (arguments.length > 1) {
      return value;
    } else {
      var snapshot = get(this, "_snapshot");
      if (!snapshot) {
        return null;
      } else {
        return snapshot.val();
      }
    }
  }).property("_snapshot"),

  buildFirebaseReference: function(){
    var id        = get(this, 'id'),
        parent    = get(this, 'parent');

    Ember.assert("meta models must belong to a parent in order to generate a Firebase reference", parent);

    return parent.buildFirebaseReference().child(id);
  },

  toFirebaseJSON: function(includePriority) {
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships');

    if (attributes.length || attributes.length) {
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
  }

});

FP.MetaModel.reopenClass(FP.ModelClassMixin);