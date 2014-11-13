import Ember from 'ember';
import {
  ModelMixin,
  ModelClassMixin
} from './model-mixin';

var get    = Ember.get;
var isNone = Ember.isNone;


var MetaModel = Ember.ObjectProxy.extend(ModelMixin, {
  id:        Ember.computed.alias('content.id'),
  priority:  null,
  parent:    null,
  parentKey: null,

  // meta is the simple value of the snapshot
  // if attributes are defined then you can't also have a meta value
  meta: Ember.computed(function(key, value){
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships');

    if (attributes.size || relationships.size) {
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

    Ember.assert("meta models must belong to a parent in order to generate a Firebase reference", !!parent);

    return parent.buildFirebaseReference().child(id);
  },

  toFirebaseJSON: function(includePriority) {
    var attributes    = get(this.constructor, 'attributes'),
        relationships = get(this.constructor, 'relationships');

    if (attributes.size || relationships.size) {
      var attrJSON = this._super(includePriority);

      // if attributes are null, then we'll get an empty object back
      // we don't want to save this as that'll be treated as deleting the meta model!
      if (!Ember.$.isEmptyObject(attrJSON)) {
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

export default MetaModel;

MetaModel.reopenClass(ModelClassMixin);
