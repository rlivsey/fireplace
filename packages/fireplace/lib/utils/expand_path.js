var get = Ember.get;

FP.Utils = FP.Utils || {};
FP.Utils.expandPath = function(path, opts) {
  return path.replace(/{{([^}]+)}}/g, function(match, optName){
    var value = get(opts, optName);
    Ember.assert("Missing part for path expansion, looking for "+optName+" in "+Ember.inspect(opts) + " for "+path, value);
    return value;
  });
};