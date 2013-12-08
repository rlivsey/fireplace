var get = Ember.get;

FP.Utils = FP.Utils || {};
FP.Utils.expandPath = function(path, opts) {
  return path.replace(/{{([^}]+)}}/g, function(match, optName){
    var value = get(opts, optName);
    Ember.assert("missing part for path generation ("+optName+")", value);
    return value;
  });
};