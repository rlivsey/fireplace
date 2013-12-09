require('fireplace/model/model_mixin');

var get = Ember.get;

FP.MetaModel = Ember.ObjectProxy.extend(FP.ModelMixin, {
  id:        Ember.computed.alias('content.id'),
  meta:      null,
  priority:  null,
  parent:    null,
  parentKey: null,

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
      return this._super(includePriority);
    }

    var meta = get(this, "meta");
    if (meta === null || meta === undefined) {
      meta = true;
    }

    if (includePriority) {
      return this.wrapValueAndPriority(meta);
    } else {
      return meta;
    }
  }

});

FP.MetaModel.reopenClass(FP.ModelClassMixin);