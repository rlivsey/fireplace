/* jshint node: true */
'use strict';

module.exports = {
  name: 'fireplace',
  included: function(app) {
    this._super.included(app);
    this.app.import(app.bowerDirectory + '/firebase/firebase.js');
    this.app.import(app.bowerDirectory + '/ember-inflector/ember-inflector.js');
  }
};
