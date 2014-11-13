import Ember from 'ember';

var get     = Ember.get;
var assert  = Ember.assert;
var inspect = Ember.inspect;

export default function(path, context) {
  return path.replace(/{{([^}]+)}}/g, function(match, key){
    var value = get(context, key);
    assert("Missing part for path expansion, looking for "+key+" in "+inspect(context) + " for "+path, !!value);
    return value;
  });
}
