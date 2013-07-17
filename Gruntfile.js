module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 4000,
          keepalive: true
        }
      }
    }
  });

  grunt.registerTask('server', ['connect:server']);
};
