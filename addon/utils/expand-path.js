import Ember from 'ember';

const get     = Ember.get;
const assert  = Ember.assert;
const inspect = Ember.inspect;

export default function(path, context) {
  return path.replace(/{{([^}]+)}}/g, (match, key) => {
    const value = get(context, key);
    assert("Missing part for path expansion, looking for "+key+" in "+inspect(context) + " for "+path, !!value);
    return value;
  });
}
