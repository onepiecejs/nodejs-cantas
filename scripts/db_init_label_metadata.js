(function(module) {

  'use strict';

  var async = require('async');
  var mongoose = require('mongoose');
  var settings = require(__dirname + '/../settings');
  var LabelMetadata = require(__dirname + '/../models/metadata').LabelMetadata;


  if (settings.mongodb.url) {
    mongoose.connect(settings.mongodb.url);
  } else {
    mongoose.connect(
      settings.mongodb.host,
      settings.mongodb.name,
      settings.mongodb.port,
      {
        user: settings.mongodb.user,
        pass: settings.mongodb.pass
      }
    );
  }

  var init_data = [
    {order: 1, title: '', color: '#E7BAB6'},
    {order: 2, title: '', color: '#A2D98C'},
    {order: 3, title: '', color: '#F0F064'},
    {order: 4, title: '', color: '#BDF2E6'},
    {order: 5, title: '', color: '#7DC2FF'},
    {order: 6, title: '', color: '#F5BE55'},
    {order: 7, title: '', color: '#CEB3E6'},
    {order: 8, title: '', color: '#EB9588'}
  ];

  process.on('exit', function() {
    mongoose.disconnect(function() {
      console.log('Disconnected from mongodb.');
    });
  });

  module.exports.init = function() {
    LabelMetadata.remove(function(err) {
      if (err) {
        console.error('Cannot remove all label metadata from mongodb.');
        process.exit(1);
      }

      async.map(init_data,
        function(metadata, callback) {
          var lm = new LabelMetadata(metadata);
          lm.save(function(err, savedObject) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, true);
            }
          });
        },
        function(err, results) {
          if (err) {
            console.error('Not all label metadata is stored.');
            process.exit(1);
          } else {
            console.log('Label metadata is initialized successfully.');
            process.exit(0);
          }
        });
    });
  };

}(module));

if (require.main === module) {
  module.exports.init();
}
