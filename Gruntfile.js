module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-bbb-server');
  grunt.initConfig({
    server: {
      port: 8080,
      base: './'
    }
  });
};
