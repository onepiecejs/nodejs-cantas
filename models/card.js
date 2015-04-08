(function (module) {

  "use strict";

  var async = require('async');
  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var Comment = require('./comment');
  var ChecklistItem = require('./checklistItem');
  var Vote = require('./vote');
  var Attachment = require('./attachment');
  var User = require('./user');
  // Both Board and List are loaded lazily to avoid circular dependency.
  var Board, List;
  var CardSchema;

  var requireBoard = function() {
    if (Board === undefined) {
      Board = require('./board');
    }
    return Board;
  };

  var requireList = function() {
    if (List === undefined) {
      List = require('./list');
    }
    return List;
  };

  CardSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, default: 'Description'},
    isArchived: { type: Boolean, default: false },
    updated: { type: Date, default: Date.now },
    created: { type: Date, default: Date.now },
    dueDate: { type: Date, required: false, default: null },
    order: { type: Number, default: -1},
    creatorId: { type: ObjectId, required: true, index: true },
    assignees: [ {type: ObjectId, ref: 'User', index: true} ],
    listId: { type: ObjectId, required: true, ref: 'List', index: true },
    boardId: { type: ObjectId, required: true, ref: 'Board', index: true },
    subscribeUserIds: { type: Array },
    perms: {
      delete: {
        users: [ ObjectId ],
        roles: [ ObjectId ]
      },
      update: {
        users: [ ObjectId ],
        roles: [ ObjectId ]
      }
    }
  });

  CardSchema.pre('save', function(next) {
    this.updated = new Date();
    next();
  });

  CardSchema.post('save', function(card) {
    card.populate('boardId', function(err) {
      if (err) {
        console.log('The card %s, update boardId failed', card._id);
        return false;
      }

      card.boardId.updated = new Date();
      card.boardId.save();
    });
  });

  // virtual attributes
  CardSchema.virtual('timeLeft')
    .get(function() {
      return (this.dueDate - Date.now);
    });

  CardSchema.virtual('url').get(function() {
    return "/card/" + this.id;
  });

  // model methods
  CardSchema.method('getOrder', function() {
    return this.order;
  });

  CardSchema.method('getSubscribeUsers', function(callback) {
    var cardId = this._id;
    var subscribeUserIds = this.subscribeUserIds;
    User.find({_id: {$in: subscribeUserIds}}, 'username email', function(err, subscribeUsers) {
      callback(err, subscribeUsers);
    });
  });

  CardSchema.method('getCover', function(callback) {
    var cardId = this.id;
    var cover = '';
    Attachment.findOne({ cardId: cardId, isCover: true }, 'cardThumbPath path',
      function (err, attachment) {
        if (attachment) {
          if (attachment.cardThumbPath) {
            cover = attachment.cardThumbPath;
          } else {
            cover = attachment.path;
          }
        }

        callback(err, cover);
      });
  });

  CardSchema.method('getBadges', function(callback) {
    var cardId = this.id;
    var badges = {};
    return async.parallel([
      function(callback) {
        // count comments of this card
        Comment.count({cardId: cardId}, function(err, count) {
          badges.comments = count || 0;
          callback(null, badges.comments);
        });
      },
      function(callback) {
        // count checklist items of this card
        ChecklistItem.count({cardId: cardId}, function(err, count) {
          badges.checkitems = count || 0;
          callback(null, badges.checkitems);
        });
      },
      function(callback) {
        // count checked checklist items of this card
        ChecklistItem.count({cardId: cardId, checked: true}, function(err, count) {
          badges.checkitemsChecked = count || 0;
          callback(null, badges.checkitemsChecked);
        });
      },
      function(callback) {
        // count the num of votes that vote yes of the card
        Vote.count({cardId: cardId, yesOrNo: true}, function(err, count) {
          badges.votesYes = count || 0;
          callback(null, badges.votesYes);
        });
      },
      function(callback) {
        // count the num of votes that vote no of the card
        Vote.count({cardId: cardId, yesOrNo: false}, function(err, count) {
          badges.votesNo = count || 0;
          callback(null, badges.votesNo);
        });
      },
      function(callback) {
        // count attachment of the card
        Attachment.count({cardId: cardId}, function(err, count) {
          badges.attachments = count || 0;
          callback(null, badges.attachments);
        });
      }
    ], function(err, result) {
      callback(err, badges);
    });
  });


  /**
   * Get the cards board meta (id, title and status)
   */
  CardSchema.method('getBoardMeta', function(callback) {
    if (!this.boardId) {
      return null;
    }

    requireBoard().findOne({
      _id: this.boardId
    }, 'title isPublic isClosed', callback);
  });


  /**
   * Get the cards list meta (id, title)
   */
  CardSchema.method('getListMeta', function(callback) {
    if (!this.listId) {
      return null;
    }

    requireList().findOne({
      _id: this.listId
    }, 'title', callback);
  });



  module.exports = mongoose.model('Card', CardSchema);

}(module));
