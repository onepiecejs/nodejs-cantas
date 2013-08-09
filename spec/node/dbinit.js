'use strict';

var mongoose = require('mongoose');
var dbURI = 'mongodb://localhost/cantas_test';
var async = require('async');

beforeEach(function (done) {

  function clearDB() {
    async.series([
      function(callback){
        for (var i in mongoose.connection.collections) {
          mongoose.connection.collections[i].remove(function() {});
        }
        callback(null);
      },
      function(callback){
        for (var i in mongoose.connection.collections) {
          mongoose.connection.collections[i].dropAllIndexes(function() {});
        }
        callback(null);
      }
    ],
    function(err, results){
      if(err || !results) throw err;
       done();
    });
  }

  if (mongoose.connection.readyState === 0) {
    mongoose.connect(dbURI, function (err) {
      if (err) {
        throw err;
      }
      return clearDB();
    });
    mongoose.set('debug', true);
  } else {
    return clearDB();
  }
});

afterEach(function (done) {
  setTimeout(function(){
    mongoose.connection.close();
    done();
  },0);
});
