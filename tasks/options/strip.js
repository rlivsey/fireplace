module.exports = {
  production : {
    src : 'dist/fireplace.prod.js',
    options : {
      inline: true,
      nodes : ['Ember.assert']
    }
  }
};
