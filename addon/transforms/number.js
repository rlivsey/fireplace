import Ember from 'ember';
import Transform from './base';

export default Transform.extend({

  deserialize: function(serialized) {
    return Ember.isEmpty(serialized) ? null : Number(serialized);
  },

  serialize: function(deserialized) {
    return Ember.isEmpty(deserialized) ? null : Number(deserialized);
  }
});