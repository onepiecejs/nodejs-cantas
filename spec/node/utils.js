"use strict";

var async = require("async");


var removeEachSeries = function(objs, done) {
  async.eachSeries(objs,
    function(obj, callback) {
      obj.remove(function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    },
    function(err) {
      if (err) { throw err; }
      done();
    });
}

module.exports.removeEachSeries = removeEachSeries;