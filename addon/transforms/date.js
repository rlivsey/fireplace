import Transform from './base';
import dateParse from '../utils/date-parse';

export default Transform.extend({
  deserialize(value) {
    if (!value || typeof value !== "string") {
      return null;
    }
    return new Date(dateParse(value));
  },

  serialize(value) {
    if (!value || !value.toISOString) {
      return null;
    }
    return value.toISOString();
  }
});