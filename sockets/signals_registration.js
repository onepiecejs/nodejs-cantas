
(function(module) {

  "use strict";

  var async = require("async");
  var signals = require("./signals");
  var Board = require("../models/board");
  var Card = require("../models/card");
  var MemberRelation = require("../models/boardMemberRelation");
  var Comment = require("../models/comment");
  var ChecklistItem = require("../models/checklistItem");
  var handlers = require('./signalHandlers');

  signals.post_delete.connect(MemberRelation, function(sender, args, done) {
    var socket = args.socket;
    async.waterfall([
      // Find cards assigned to the member
      function(callback){
        Card.find(
          {boardId: args.instance.boardId, assignees: args.instance.userId},
          {_id: 1},
          function(err, cards){
            if (err){
              callback(err, null);
            }else{
              var cardIds = [];
              if (cards.length){
                cardIds = cards.map(function(card){return card.id});
              }
              callback(null, cardIds);
            }
        });
      },
      // Remove the user from cards assigned to him
      function(cardIds, callback){
        if (cardIds.length){
          cardIds.forEach(function(cardId){
            Card.findByIdAndUpdate(cardId,
              {$pull: {assignees: args.instance.userId}},
              function(err, updatedCard){
                if(!err){
                  updatedCard.populate('assignees', function(err, card){
                    if (!err){
                      var name = '/card/' + card.id + ':update';
                      socket.room.emit(name, card);
                    }
                  });
                }
            });
          });
        }
        callback(null, true);
      }
    ], done);
  });

  signals.post_create.connect(Comment, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card){
      if(!err){
        card.getBadges(function(err, badges){
          if(!err){
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });
      }
    });
  });

  signals.post_create.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card){
      if(!err){
        card.getBadges(function(err, badges){
          if(!err){
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });
      }
    });
  });

  signals.post_patch.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card){
      if(!err){
        card.getBadges(function(err, badges){
          if(!err){
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });
      }
    });
  });

  signals.post_delete.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card){
      if(!err){
        card.getBadges(function(err, badges){
          if(!err){
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });
      }
    });
  });

  /*
   * Attach fixed labels to newly created card
   */
  signals.post_create.connect(Board, function(sender, args, done) {
    console.log('>>> board is created');
    handlers.attachLabelsToBoard(args.instance, done);
  });

  /*
   * Attach fixed labels to newly created board
   */
  signals.post_create.connect(Card, function(sender, args, done) {
    handlers.attachLabelsToCard(args.instance, done);
  });

})(module);
