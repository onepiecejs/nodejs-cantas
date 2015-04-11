/*
 * Migration: add labels to all existing cards.
 *
 * *RULES*:
 * - Only ADD labels, not update.
 * - Add all existing labels to all cards that has no label. This is because
 *   every card has a fixed number of labels from current requirement.
 *
 * Author: Chenxiong Qi
 * Date: 2013-06-26
 */

(function(module) {

  'use strict';

  var async = require('async');
  var mongoose = require('mongoose');
  var Card = require('../../models/card');
  var CardLabelRelation = require('../../models/cardLabelRelation');
  var Label = require('../../models/label');
  var settings = require('../../settings');

  //require('./requiredb');

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

  var taskPrepareData = function prepareData(cards, labels, asyncCallback) {
    var migrationData = [];
    cards.forEach(function(card) {
      labels.forEach(function(label) {
        if (label.boardId.toString() === card.boardId.toString()) {
          migrationData.push({
            boardId: card.boardId,
            cardId: card._id,
            labelId: label._id
          });
        }
      });
    });
    asyncCallback(null, migrationData);
  };

  /*
   * Get cards that has no label.
   */
  var taskGetCardsHasNoLabels = function getCard(asyncCallback) {
    CardLabelRelation.find({}).select('cardId').distinct('cardId', function(err, cardIds) {
      if (err) {
        asyncCallback(err, null);
      } else {
        var condition = {_id: {$nin: cardIds}};
        Card.find(condition, '_id boardId', asyncCallback);
      }
    });
  };

  /*
   * Get all labels.
   */
  var taskGetBoardsLabels = function getBoardsLabels(cards, asyncCallback) {
    var boardIds = [];
    cards.forEach(function(card) {
      boardIds.push(card.boardId);
    });
    Label.find({boardId: {$in: boardIds}}, '_id boardId', function(err, labels) {
      if (err) {
        asyncCallback(err, null);
      } else {
        asyncCallback(null, cards, labels);
      }
    });
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
      taskGetCardsHasNoLabels,
      taskGetBoardsLabels,
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
   * @param callback: a function called by passing possible error object and
   * the result whether process succeeds.
   */
  var migration = function migration(migrateData, callback) {
    async.map(migrateData,
      function(data, asyncCallback) {
        var relation = new CardLabelRelation(data);
        relation.save(function(err, savedObject) {
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
        process.exit(result ? 0 : 1);
      });
    }
  });
}
