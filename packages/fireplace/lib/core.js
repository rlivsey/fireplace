/**
  @module fireplace
*/

/* global FP: true */

/**
  All Fireplace methods and functions are defined inside of this namespace.

  @class FP
  @static
*/
var FP;
if ('undefined' === typeof FP) {
  FP = Ember.Namespace.create({
    VERSION: '0.0.8'
  });

  if ('undefined' !== typeof window) {
    window.FP = FP;
  }

  if (Ember.libraries) {
    Ember.libraries.registerCoreLibrary('Fireplace', FP.VERSION);
  }
}
