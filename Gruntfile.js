
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */'
    },

    concat: {
      options: {
        stripBanners: true,
        // define a string to put between each file in the concatenated output
        separator: ';',
        banner:  '<%= meta.banner %>'
      },
      'cantas': {
        src:[
          'public/javascripts/vendor/jquery-1.7.2.js',
          'public/javascripts/vendor/jquery-ui.js',
          'public/javascripts/vendor/jquery.slug.js',
          'public/javascripts/vendor/bootstrap-dropdown.js',
          'public/javascripts/vendor/bootstrap-tab.js',
          'public/javascripts/vendor/bootstrap-modal.js',
          'public/javascripts/vendor/bootstrap-modalmanager.js',
          'public/javascripts/vendor/async.js',
          'public/javascripts/vendor/underscore.js',
          'public/javascripts/vendor/backbone.js',
          'public/javascripts/vendor/backbone.iobind.js',
          'public/javascripts/vendor/backbone.iosync.js',
          'public/javascripts/vendor/moment.js',
          'public/javascripts/vendor/markdown.js',
        ],
        dest: 'public/javascripts/dist/vendor.js'
      },
      'cantas-app': {
        src:[
          'public/javascripts/constants.js',
          'public/javascripts/sortable.js',
          'public/javascripts/utils/utils.js',
          'public/javascripts/utils/safe_string.js',
          'public/javascripts/application.js',
          'public/javascripts/models/base.js',
          'public/javascripts/views/base.js',
          'public/javascripts/models/activity.js',
          'public/javascripts/views/activity.js',
          'public/javascripts/models/notification.js',
          'public/javascripts/views/notification.js',
          'public/javascripts/models/boardMember.js',
          'public/javascripts/views/boardMembers.js',
          'public/javascripts/models/label.js',
          'public/javascripts/models/board.js',
          'public/javascripts/views/board.js',
          'public/javascripts/models/list.js',
          'public/javascripts/views/list.js',
          'public/javascripts/models/checklist.js',
          'public/javascripts/views/checklist.js',
          'public/javascripts/models/card.js',
          'public/javascripts/views/card.js',
          'public/javascripts/models/comment.js',
          'public/javascripts/views/comment.js',
          'public/javascripts/views/boardlist.js',
          'public/javascripts/views/help.js',
          'public/javascripts/views/confirmDialog.js',
          'public/javascripts/models/visitor.js',
          'public/javascripts/views/boardActiveUsers.js',
          'public/javascripts/router.js'
          ],
        dest: 'public/javascripts/dist/cantas-app.js'
      }
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>',
        mangle: {toplevel: true},
        squeeze: {dead_code: false},
        codegen: {quote_keys: true}
      },
      'cantas': {
        src: 'public/javascripts/dist/vendor.js',
        dest: 'public/javascripts/dist/vendor.min.js'
      },
      'cantas-app': {
        src: 'public/javascripts/dist/cantas-app.js',
        dest: 'public/javascripts/dist/cantas-app.min.js'
      }
    },

    cssmin: {
      minify: {
        expand: true,
        cwd: 'public/stylesheets/',
        src: ['*.css', '!*.min.css'],
        dest: 'public/stylesheets/',
        ext: '.min.css'
      }
    },

    jasmine: {
      'cantas': {
        src : [
          'public/javascripts/utils/utils.js',
          'public/javascripts/application.js',
          'public/javascripts/constants.js',
          'public/javascripts/models/base.js',
          'public/javascripts/models/activity.js',
          'public/javascripts/models/board.js',
          'public/javascripts/models/list.js',
          'public/javascripts/models/card.js',
          'public/javascripts/models/comment.js',
          'public/javascripts/models/notification.js',
          'public/javascripts/models/visitor.js',
          'public/javascripts/models/boardMember.js',
          'public/javascripts/models/checklist.js',
          'public/javascripts/models/label.js',
          'public/javascripts/views/notification.js',
          'public/javascripts/views/card.js',
          'public/javascripts/sortable.js',
          'public/javascripts/router.js',
          'public/javascripts/views/list.js',
          'public/javascripts/views/base.js',
          'public/javascripts/views/confirmDialog.js',
          'public/javascripts/views/checklist.js'
        ],
        options: {
          specs : ['spec/javascripts/**/*.spec.js'],
          helpers : 'spec/helpers/*.js',
          vendor: ['node_modules/socket.io/node_modules/socket.io-client/dist/socket.io.js',
          'public/javascripts/dist/vendor.js']
        }
      }
    },

    simplemocha: {
      options: {
        timeout: 3000,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'spec'
      },
      all: ['spec/node/**/*-test.js']
    },

    watch: {
      scripts: {
        files: ['spec/javascripts/**/*.spec.js',
          ],
        tasks: ['jasmine:cantas'],
        options: {
          nospawn: true,
          },
        },
    }
  });

  // concat&& uglify task
  grunt.registerTask('default', ['concat:cantas', 'uglify:cantas','concat:cantas-app','uglify:cantas-app','jasmine:cantas','simplemocha','cssmin']);
  //frontend javascript test
  grunt.registerTask('test', ['jasmine:cantas']);
  grunt.registerTask('node', 'simplemocha');
};
