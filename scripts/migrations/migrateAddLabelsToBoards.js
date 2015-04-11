/*
 * Migration: add labels to all existing boards.
 *
 * *RULES*:
 * - Only ADD labels, not update.
 * - Add all existing labels to all boards that has no label. This is because
 *   every boards has a fixed number of labels from current requirement.
 *
 * Author: Chenxiong Qi
 * Date: 2013-06-26
 */

(function(module) {

  'use strict';

  var async = require('async');
  var mongoose = require('mongoose');
  var Board = require('../../models/board');
  var Label = require('../../models/label');
  var LabelMetadata = require('../../models/metadata').LabelMetadata;
  var settings = require('../../settings');

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

  /*
   * Get boards that has no label.
   */
  var taskGetBoardsHasNoLabels = function getBoards(asyncCallback) {
    Label.find({}).select('boardId').distinct('boardId', function(err, labels) {
      if (err) {
        asyncCallback(err, null);
      } else {
        var boardIds = [];
        labels.forEach(function(label) {
          boardIds.push(label);
        });

        var condition = {_id: {$nin: boardIds}};
        Board.find(condition, '_id', asyncCallback);
      }
    });
  };

  /*
   * Get labels' metadata.
   */
  var taskGetLabelMetadata = function getLabelMetadata(boards, asyncCallback) {
    LabelMetadata.find(function(err, labelsMetadata) {
      if (err) {
        asyncCallback(err, null);
      } else {
        asyncCallback(null, boards, labelsMetadata);
      }
    });
  };

  var taskPrepareData = function prepareData(boards, labelsMetadata, asyncCallback) {
    var migrationData = [];
    boards.forEach(function(board) {
      labelsMetadata.forEach(function(metadata) {
        migrationData.push({
          boardId: board._id,
          order: metadata.order,
          color: metadata.color,
          title: metadata.title
        });
      });
    });
    asyncCallback(null, migrationData);
  };

  /*
   * Prepare the relation data between card and labels.
   *
   * @param callback: a function when data is ready or some error occurs. It
   * follows the argument convention used in Node. Prepared data is passed to
   * second argument.
   *
   * Data format: [
   *  [{labelId: '', cardId: '', boardId: ''}, ...],
   *  ...
   * ]
   */
  var prepareData = function prepareData(callback) {
    async.waterfall([
      taskGetBoardsHasNoLabels,
      taskGetLabelMetadata,
      taskPrepareData
    ], callback);
  };


  /*
   * TODO: support rollback when error occurs.
   *
   * Build relation between card and labels.
   *
   * @param data: the migration data, which contains the relations between
   * label and card.
   *
   * @param callback: a function called by passing possible error object and
   * the result whether process succeeds.
   */
  var migration = function migration(migrateData, callback) {
    async.map(migrateData,
      function(data, asyncCallback) {
        var label = new Label(data);
        label.save(function(err, savedObject) {
          if (err) {
            asyncCallback(err, null);
          } else {
            asyncCallback(null, true);
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

    async.waterfall([
      prepareData,
      migration
    ], function(err, result) {
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
