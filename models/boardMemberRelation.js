/*
 * Relationship between Board and Users to represent the board member relation.
 */

(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var Board = require('./board');
  var memberStatus = require('./boardMemberStatus');
  var util = require('util');

  /*
   * Board member schema to remember the history and relationship between an
   * user and a board.
   */
  var BoardMemberRelationSchema = new Schema({
    boardId: { type: ObjectId, require: true, ref: 'Board', index: true },
    // Reference to the real User schema
    userId: { type: ObjectId, required: true, ref: 'User', index: true },
    // When member is added into board in whatever way
    addedOn: { type: Date, default: Date.now },
    // When member is kicked off from board
    // If user is not kicked off from this board, this is undefined always.
    quitOn: { type: Date, default: '' },
    /*
     * The status of member in this board, possible value are
     * unknown: not specified
     * available: user is a valid member
     * inviting: waiting for user's acknowledge of invitation
     * kickedOff: user is not a member.
     * 
     * Reference to BoardMemberStatus
     */
    // FIXME: replace kickedOff with other sensitive names, like revoked,
    //        kickedOut, unavialable, etc.
    status: { type: String, default: '' }
  });

  //statc method
  // check the user is valid for specified board
  // @param
  // userId
  // boardId
  // @return true mean valid member

  BoardMemberRelationSchema.statics.isBoardMember = function(userId, boardId, callback) {
    var conditions = {
      userId: userId,
      boardId: boardId,
      $or: [{status: memberStatus.available}, {status: memberStatus.inviting}]
    };

    this.find(conditions, function(err, relations) {
      if (err) {
        callback(err, null);
        return;
      }

      if (relations.length === 0) {
        // To see whether user is the creator of that board.
        conditions = {_id: boardId, creatorId: userId};
        mongoose.model('Board').find(conditions, "_id", function(err, boards) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, boards.length > 0);
          }
        });
      } else {
        callback(null, true);
      }
    });

  };

  /*
   * Revoke user's board membership from a specific board.
   *
   * Arguments:
   * - userId: Id of user whose board membership is revoked.
   * - boardId: Id of the board from which user's membership is revoked.
   * - callback: a function called when revoke is done. The first argument is
   *             the error object, and the second one is the relation object
   *             that is just updated.
   */
  BoardMemberRelationSchema.statics.revoke = function(userId, boardId, callback) {
    var condition = { userId: userId, boardId: boardId };
    var update = { $set: { quitOn: Date.now(), status: memberStatus.kickedOff } };
    this.findOneAndUpdate(condition, update).populate('userId').exec(function(err, relation) {
      if (err) {
        callback(err, null);
      } else {
        // In case of user might not in the board, just ignore and this should
        // not cause error.
        callback(null, relation);
      }
    });
  };

  BoardMemberRelationSchema.statics.getBoardMembers = function(boardId, callback) {
    var conditions = {
      boardId: boardId,
      $or: [ {status: memberStatus.available}, {status: memberStatus.inviting} ]
    };
    this.find(conditions).populate("boardId userId").exec(callback);
  };

  BoardMemberRelationSchema.statics.getInvitedBoardsByMember = function(userId, callback) {
    var conditions = {
      userId: userId,
      status: memberStatus.available
    };
    this.find(conditions).populate("boardId userId").exec(function(err, boardRelation) {
      if (!boardRelation) {
        var error = util.format('error: no invitedBoards');
        return callback(error, null);
      }
      var invitedBoardIds = [];
      boardRelation.forEach(function(relation) {
        invitedBoardIds.push(relation.boardId);
      });
      callback(err, invitedBoardIds);
    });
  };

  module.exports = mongoose.model("BoardMemberRelation",
    BoardMemberRelationSchema);

}(module));
