
(function(module) {

  'use strict';

  var async = require('async');
  var Label = require('../models/label');
  var Card = require('../models/card');
  var LabelMetadata = require('../models/metadata').LabelMetadata;
  var CardLabelRelation = require('../models/cardLabelRelation');

  module.exports.attachLabelsToCard = function(card, done) {
    Label.find({boardId: card.boardId}, function(err, labels) {
      if (err) {
        console.error(err.message);
        done(err, false);
        return;
      }

      async.map(labels,
        function(label, callback) {
          var relation = new CardLabelRelation({
            cardId: card._id,
            boardId: card.boardId,
            labelId: label._id
          });
          relation.save(function(err, savedObject) {
            if (err) {
              callback(err, false);
            } else {
              callback(null, true);
            }
          });
        },
        function(err, results) {
          if (err) {
            console.error('Not all labels are attached to card.', err.messge);
            done(err, false);
          } else {
            var isAllDone = results.reduce(function(prevValue, curValue) {
              return prevValue && curValue;
            }, true);
            if (!isAllDone) {
              console.error('Not all labels are attached to card.');
            }
            done(null, true);
          }

        });
    });
  };

  /*
   * Each board has a fixed number of labels. When a new board is created,
   * create labels for it.
   */
  module.exports.attachLabelsToBoard = function(board, done) {
    LabelMetadata.find(function(err, metadata) {
      if (err) {
        console.error(err.message);
        done(err, false);
        return;
      }
      async.map(metadata,
        function(item, callback) {
          var label = new Label({
            title: item.title,
            order: item.order,
            color: item.color,
            boardId: board._id
          });
          label.save(function(err, savedObject) {
            if (err) {
              callback(err, false);
            } else {
              callback(null, true);
            }
          });
        },
        function(err, results) {
          if (err) {
            console.error('Not all labels are attached to board.', err.message);
            done(err, false);
          } else {
            var isAllDone = results.reduce(function(prevValue, curValue) {
              return prevValue && curValue;
            }, true);
            if (isAllDone) {
              console.error('Not all labels are attached to board.');
            }
            done(null, true);
          }
        });
    });
  };

  module.exports.updateCardBadges = function(args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });
      }
    });
  };

}(module));
