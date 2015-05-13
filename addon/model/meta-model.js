import Ember from 'ember';
import {
  ModelMixin,
  ModelClassMixin
} from './model-mixin';

const get    = Ember.get;
const isNone = Ember.isNone;


const MetaModel = Ember.ObjectProxy.extend(ModelMixin, {
  id:        Ember.computed.alias('content.id'),
  priority:  null,
  parent:    null,
  parentKey: null,

  // meta is the simple value of the snapshot
  // if attributes are defined then you can't also have a meta value
  meta: Ember.computed("snapshot", {
    get() {
      const attributes    = get(this.constructor, 'attributes');
      const relationships = get(this.constructor, 'relationships');

      if (attributes.size || relationships.size) {
        return null;
      }

      return get(this, "snapshot").val();
    },
    set(key, value) {
      const attributes    = get(this.constructor, 'attributes');
      const relationships = get(this.constructor, 'relationships');

      if (attributes.size || relationships.size) {
        return null;
      }

      return value;
    }
  }),

  buildFirebaseReference(){
    const id        = get(this, 'id');
    const parent    = get(this, 'parent');

    Ember.assert("meta models must belong to a parent in order to generate a Firebase reference", !!parent);

    return parent.buildFirebaseReference().child(id);
  },

  toFirebaseJSON(includePriority) {
    const attributes    = get(this.constructor, 'attributes');
    const relationships = get(this.constructor, 'relationships');

    if (attributes.size || relationships.size) {
      const attrJSON = this._super(includePriority);

      // if attributes are null, then we'll get an empty object back
      // we don't want to save this as that'll be treated as deleting the meta model!
      if (!Ember.$.isEmptyObject(attrJSON)) {
        return attrJSON;
      }
    }

    let meta = get(this, "meta");
    if (isNone(meta)) {
      meta = true;
    }

    if (includePriority) {
      return this.wrapValueAndPriority(meta);
    } else {
      return meta;
    }
  },

  saveContent() {
    return this.get("content").save();
  },

  changeCameFromFirebase: Ember.computed(function() {
    return !!this._settingFromFirebase || get(this, "content.changeCameFromFirebase");
  }).volatile()

});

export default MetaModel;

MetaModel.reopenClass(ModelClassMixin);
