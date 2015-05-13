import Ember from 'ember';
import Transform from './base';

export default Transform.extend({

  deserialize(serialized) {
    return Ember.isEmpty(serialized) ? null : Number(serialized);
  },

  serialize(deserialized) {
    return Ember.isEmpty(deserialized) ? null : Number(deserialized);
  }
});