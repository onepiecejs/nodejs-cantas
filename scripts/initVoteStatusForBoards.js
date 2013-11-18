/*
 * Migration: initialize vote status to existing boards.
 *
 * *RULES*:
 * - Boards those have no vote status are searched.
 * - Add voteStatus attribute with default value `enabled`.
 *
 * This script can be run REPEATABLY.
 *
 * Author: Chenxiong Qi
 * Date: 2013-07-08
 */

(function(module) {

  'use strict';

  var async = require('async');
  var mongoose = require('mongoose');
  var Board = require('../models/board');
  var configStatus = require('../models/configStatus');
  var settings = require('../settings');

  var beforeMigration = function beforeMigration() {
    mongoose.connect(
      settings.mongodb.host,
      settings.mongodb.name,
      settings.mongodb.port,
      {
        user: settings.mongodb.user,
        pass: settings.mongodb.pass
      }
    );

    process.on('exit', function() {
      mongoose.disconnect(function() {
        console.log('Disconnected from mongodb.');
      });
    });
  };

  var _migrate = function(callback) {
    Board.find({voteStatus: {$exists: false}}, '_id', function(err, boards) {
      async.map(boards,
        function(board, asyncCallback) {
          var updateData = {$set: {voteStatus: configStatus.enabled}};
          Board.findByIdAndUpdate(board._id, updateData, function(err, updatedBoard) {
            if (err) {
              asyncCallback(err, null);
            } else {
              asyncCallback(null, updatedBoard !== false);
            }
          });
        },
        function(err, results) {
          if (err) {
            callback(err, null);
          } else {
            var result = results.reduce(function(prevValue, curValue) {
              return prevValue && curValue;
            }, true);
            callback(null, result);
          }
        });
    });
  };

  var die = function die(err) {
    if (err !== undefined && err instanceof Error) {
      console.error(err.message);
      console.error(err.stack);
    }
    process.exit(1);
  };

  module.exports.migrate = function migrate(callback) {
    beforeMigration();
    _migrate(function(err, result) {
      if (err) {
        die(err);
      } else {
        callback(result);
      }
    });
  };

}(module));

if (require.main === module) {
  var readline = require('readline');
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Migration will start. Are you sure? [y/N] ', function(answer) {
    var letsgo = answer === 'y' || answer === 'Y';
    if (letsgo) {
      module.exports.migrate(function(result) {
        var exitCode = result ? 0 : 1;
        process.exit(exitCode);
      });
    }
  });
}
