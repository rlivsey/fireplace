import Transform from './base';
import dateParse from '../utils/date-parse';

export default Transform.extend({
  deserialize: function(value) {
    if (!value || typeof value !== "string") {
      return null;
    }
    return new Date(dateParse(value));
  },

  serialize: function(value) {
    if (!value || !value.toISOString) {
      return null;
    }
    return value.toISOString();
  }
});