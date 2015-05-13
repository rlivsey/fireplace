import Ember from 'ember';
import Transform from './base';

export default Transform.extend({
  deserialize(serialized) {
    return Ember.isNone(serialized) ? null : String(serialized);
  },

  serialize(deserialized) {
    return Ember.isNone(deserialized) ? null : String(deserialized);
  }
});