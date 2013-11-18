(function (module) {

  "use strict";

  var mongoose = require('mongoose'),
    Mailer = require('../services/mail'),
    List = require('./list'),
    Activity = require("./activity"),
    User = require("./user"),
    BoardMemberRelation = require('./boardMemberRelation'),
    Notification = require("../services/notification"),
    BoardMemberStatus = require("./boardMemberStatus"),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    async = require('async'),
    Sites = require("../services/sites"),
    LogActivity = require("../services/activity").Activity,

    BoardSchema = new Schema({
      title: { type: String, required: true },
      description: { type: String, default: '' },
      isClosed: { type: Boolean, default: false },
      created: { type: Date, default: Date.now },
      creatorId: { type: ObjectId, required: true, ref: 'User', index: true },
      groupId: { type: ObjectId, index: true },
      isPublic: {type: Boolean, default: true},
      voteStatus: {type: String, default: 'enabled'},
      commentStatus: {type: String, default: 'enabled'},
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

  BoardSchema.post('remove', function (board) {
    // Also remove its lists.
    List.remove({boardId: board._id}).exec();
  });


  BoardSchema.virtual('url').get(function () {
    return "/board/" + this.id;
  });

  // Static methods

  /*
   * Join Board action
   * - validate whether board exists
   * - update inviting member status
   * - confirm a user's membership if current user is invited to the board
   * - check the member is board member at enter private board
   * Finally, join current user to board and notify client everything is okay.
   *
   */
  BoardSchema.statics.joinBoard = function (user, boardId, socket, callback) {
    var that = this,
      result = null;

    async.waterfall([
      function (callback) {
        that.findById(boardId,
          "_id isPublic creatorId isClosed",
          function (err, board) {
            if (err || board === null) {
              result = {ok: 1, message: 'no valid board'};
              return callback(result, null);
            }
            callback(null, board);
          });
      },
      function (board, callback) {
        if (user === null) {
          result = {ok: 1, message: 'no user defined'};
          return callback(result, null);
        }
        if (board.isClosed) {
          result = {ok: 1, message: 'closed', board: board};
          return callback(result, null);
        }
        board.getMemberStatus(user._id, function (err, status) {
          if (err) {
            result = {ok: 1, message: 'getMemberStatus failed'};
            return callback(result, null);
          }

          if (status === BoardMemberStatus.inviting) {
            //update user status
            board.confirmInvitation(user._id, function (err, obj) {
              if (err) {
                result = {ok: 1, message: 'confirmInvitation failed'};
                return callback(result, null);
              }
              var content = user.username + ' has accepted invitation and joined the board.';
              var activity = new LogActivity({socket: socket, exceptMe: false});
              activity.log({
                content: content,
                creatorId: user._id,
                boardId: board._id
              });

              callback(null, board);
            });
          } else {
            //redirect to next callback
            callback(null, board);
          }
        });
      },
      function (board, callback) {
        BoardMemberRelation.isBoardMember(user._id, boardId, function (err, memberStatus) {
          if (err) {
            result = {ok: 1, message: 'isBoardMember failed'};
            return callback(result, null);
          }
          callback(null, board, memberStatus);
        });
      },
      function (board, memberStatus, callback) {
        if (board.creatorId.equals(user._id) ||
            memberStatus === true) {
          result = {ok: 0, message: 'isMember', board: board};
          callback(null, result);
        } else if (board.isPublic === true && memberStatus === false) {
          result = {ok: 0, message: 'normal', board: board};
          callback(null, result);
        } else {
          //private board without member relation, you can't login
          result = {ok: 1, message: 'nologin', board: board};
          return callback(result, null);
        }
      }
    ], function (err, result) {
      if (err) {
        result = err;
      }
      callback(null, result);
    });
  };

  // Schema methods

  /*
   * Get a board by Id.
   * 
   * Arguments:
   * - boardId: the ID that board is retrieving.
   * - fields: a string. Which fields are necessary to get. Field names are
   *           separated by a space. This is optional.
   * - callback: called when operation is done. Accepts two arguments as normal.
   */
  BoardSchema.statics.getById = function (boardId, fields, callback) {
    var _callback = typeof fields === 'function' ? fields : callback;
    this
      .findById(boardId)
      .select(fields)
      .populate([{ path: 'creatorId' }, { path: 'members' }])
      .exec(_callback);
  };

  /*
   * Kick off a member from a board.
   *
   * Kick off does not remove the user from board's member list permenantly.
   * Instead, just mark the user quits from this board. In this way, the
   * relationship between an user and a board can be remembered, and queried at
   * at time.
   *
   * Arguments:
   * - boardId: the Id of board from which the member is kicked off.
   * - userId: the Id of the member who is being kicked off.
   * - callback: a function, it will be invoked when all is done.
   */
  BoardSchema.statics.kickOffMember = function (boardId, userId, callback) {
    this.update(
      { _id: boardId, "members.userId": userId },
      { $set: { "members.$.quitOn": Date.now() } },
      function (err, numberAffected, raw) {
        callback(err, numberAffected, raw);
      }
    );
  };

  // Instance methods

  /*
   * Get all activities of current board.
   *
   * Arguments:
   * - callback: a function, a collection of found Activities is passed as the
   *   second argument. Error object is passed to first argument as normal.
   */
  BoardSchema.methods.getActivities = function (callback) {
    Activity.find({ boardId: this.id }, function (err, activities) {
      callback(err, activities);
    });
  };

  /*
   * Get member's status.
   *
   * Argumnets:
   * - userId: whose member's status is being retrieved.
   * - callback: a function to accept the status. The first argument is an
   *             error object and status is passed to the second one.
   */
  BoardSchema.methods.getMemberStatus = function (userId, callback) {
    var conditions = { boardId: this._id, userId: userId };
    BoardMemberRelation.findOne(conditions, function (err, relation) {
      if (err) {
        callback(err, null);
      } else {
        var status = relation === null ? null : relation.status;
        callback(err, status);
      }
    });
  };

  /*
   * Confirm a user's invitation by updating related member's status.
   *
   * Arguments:
   * - userId: whose membership is confirmed.
   * - callback: a function to accept the result. callback is passed to
   *             findOneAndUpdate directly.
   */
  BoardSchema.methods.confirmInvitation = function (userId, callback) {
    BoardMemberRelation.findOneAndUpdate(
      { boardId: this._id, userId: userId },
      { status: BoardMemberStatus.available },
      callback
    );
  };

  module.exports = mongoose.model('Board', BoardSchema);

}(module));
