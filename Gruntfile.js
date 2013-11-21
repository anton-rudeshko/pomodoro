'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    clean: ['out'],

    copy: {
      main: {
        files: [
          { expand: true, src: 'src/assets/*', dest: 'out/assets/', flatten: true },
          { expand: true, src: 'src/cache.manifest', dest: 'out/', flatten: true },
          { expand: true, src: 'src/CNAME', dest: 'out/', flatten: true }
        ]
      }
    },

    csso: {
      options: {
        report: 'min'
      },
      main: {
        files: {
          'out/css/main.css': ['src/css/main.css']
        }
      }
    },

    inlinecss: {
      main: {
        files: {
          'out/index.html': 'src/index.html'
        }
      }
    },

    uglify: {
      options: {
        report: 'min'
      },
      main: {
        files: {
          'out/js/main.js': ['src/js/main.js']
        }
      }
    },

    htmlmin: {
      options: {
        removeRedundantAttributes: true,
        removeAttributeQuotes: true,
        collapseWhitespace: true
      },
      main: {
        files: {
          'out/index.html': 'src/index.html'
        }
      }
    },

    'gh-pages': {
      options: {
        base: 'out'
      },
      src: '**/*'
    },

    watch: {

    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-inline-css');
  grunt.loadNpmTasks('grunt-csso');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');

  grunt.registerTask('build', ['clean', 'copy', 'csso', 'uglify', 'htmlmin']);
  grunt.registerTask('deploy', ['build', 'gh-pages']);
  grunt.registerTask('default', ['build']);
};
