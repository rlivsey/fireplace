module.exports = {
  options: {
    nospawn: true,
  },
  code: {
    files: ['packages/fireplace/lib/**/*.js'],
    tasks: ['jshint:development', 'neuter', 'test'],
  },
  test: {
    files: ['packages/fireplace/tests/**/*.js'],
    tasks: ['jshint:development', 'build_test_runner_file', 'test'],
  }
};
