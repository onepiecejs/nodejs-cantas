
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var Activity = require("../../models/activity");
  var BaseCRUD = require("./base");
  var Notification = require("../../services/notification");
  var BoardMemberRelation = require("../../models/boardMemberRelation");
  var utils = require("../../services/utils");

  function BoardCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/board");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(BoardCRUD, BaseCRUD);

  BoardCRUD.prototype.logActivity = function(boardId, content) {
    var self = this;
    var creatorId = this.socket.handshake.user._id;
    var activityData = {
      'content': content,
      'creatorId': creatorId,
      'boardId': boardId
    };

    new Activity(activityData).save(function(err, activity) {
      if (err) {
        console.log(err);
      } else {
        self.emitMessage('/activity:create', activity);
      }
    });
  };

  BoardCRUD.prototype._read = function(data, callback) {
    if (data) {
      if (data._id) {
        this.modelClass
          .findOne(data)
          .populate("creatorId")
          .exec(function (err, result) {
            callback(err, result);
          });
      } else {
        this.modelClass
          .find(data)
          .populate("creatorId")
          .exec(function (err, result) {
            callback(err, result);
          });
      }
    } else {
      this.modelClass.find({}, callback );
    }
  };

  BoardCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data['_id']; // _id is not modifiable

    this.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
      if (err) {
        callback(err, updatedData);
      } else {
        // TODO:
        self.emitMessage(name, updatedData);

        // All custom actions are written here.
        // It's a bad way. Signal might be better.

        if ("isClosed" in data) {
          if (data.isClosed) {
            self._notifyWhenClose();
            self._logActivityWhenClose(updatedData);
          }
        }

      }
    });

    BoardCRUD.prototype._notifyWhenClose = function(boardId) {
      async.waterfall([
        function(callback) {
          BoardMemberRelation.getBoardMembers(boardId, function(err, memberRelations) {
            if (err)
              callback(err, null);
            else
              callback(null, memberRelations);
          });
        }
      ], function(err, memberRelations) {
        if (err)
          console.log(err);
        else {
          var numberOfRelations = memberRelations.length;
          for (var i = 0; i < numberOfRelations; i++) {
            var memberRelation = memberRelations[i];
            // Do send notification to the one who are closing the board.
            var isWhoClosing = utils.idEquivalent(
              memberRelation.userId._id,
              self.socket.handshake.user._id);
            if (isWhoClosing)
              continue;
            var message = "Board \"" + memberRelation.boardId.title +  "\" is closed";
            var type = "information";
            Notification.notify(self.socket, memberRelation.userId, message, type);
          }
        }
      });
    };

    BoardCRUD.prototype._logActivityWhenClose = function(board) {
      var username = this.handshake.user.username;
      var content = "Board \"" + board.title + "\" is closed by " + username;
      this.logActivity(board._id, content);
    };

  };

  module.exports = BoardCRUD;

})(module);
