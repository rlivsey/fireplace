module.exports = {
  options: {
    filepathTransform: function(filepath) {
      filepath.replace('fireplace', 'fireplace/lib');
      return 'packages/' + filepath.replace('fireplace', 'fireplace/lib');
    }
  },
  'dist/fireplace.js': 'packages/fireplace/lib/main.js'
};
