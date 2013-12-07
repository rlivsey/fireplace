var files = ['Gruntfile.js', 'packages/fireplace/**/*.js'];

module.exports = {
  options: {
    jshintrc: '.jshintrc'
  },
  all: files,

  /* in development mode, jshint violations will allow
     tasks to continue but will output a warning in
     the terminal.
  */
  development: {
    options: { force: true },
    files: { src: files }
  }
};
