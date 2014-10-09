import Ember from 'ember';
import Transform from './base';

export default Transform.extend({
  deserialize: function(serialized) {
    return Ember.isNone(serialized) ? null : String(serialized);
  },

  serialize: function(deserialized) {
    return Ember.isNone(deserialized) ? null : String(deserialized);
  }
});