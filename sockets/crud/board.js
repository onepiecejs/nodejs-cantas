
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var Activity = require("../../models/activity");
  var BaseCRUD = require("./base");
  var Notification = require("../../services/notification");
  var BoardMemberRelation = require("../../models/boardMemberRelation");
  var utils = require("../../services/utils");
  var configDescription = require("../../models/configStatus").configDescription;
  var LogActivity = require("../../services/activity").Activity;
  var Sites = require("../../services/sites");

  function BoardCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/board");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(BoardCRUD, BaseCRUD);

  BoardCRUD.prototype.generateActivityContent = function(model, action, data, callback) {
    var content = null;
    var username = this.handshake.user.username;
    if (action === 'create') {
      var createdObject = data.createdObject;
      var sourceObject = data.sourceObject;
      content = util.format('%s added %s "%s"', username, model, createdObject.title);
      if (sourceObject) {
        content = util.format('%s converted %s "%s" to %s "%s"', username, sourceObject.model,
                  sourceObject.title, model, createdObject.title);
      }
    }
    if (action === 'update') {
      content = util.format('%s changed %s %s from "%s" to "%s"', username, model,
                data.field, data.origin_data[data.field], data.changed_data[data.field]);
      if (data.field === 'isPublic') {
        if (data.changed_data[data.field] === true) {
          content = util.format('%s set this board to public', username);
        }
        if (data.changed_data[data.field] === false) {
          content = util.format('%s set this board to private', username);
        }

      }
      var origin_config, changed_config;
      if (data.field === 'voteStatus') {
        origin_config = data.origin_data[data.field];
        changed_config = data.changed_data[data.field];
        content = util.format('%s changed vote permission from "%s" to "%s"',
                  username, configDescription[origin_config], configDescription[changed_config]);
      }
      if (data.field === 'commentStatus') {
        origin_config = data.origin_data[data.field];
        changed_config = data.changed_data[data.field];
        content = util.format('%s changed comment permission from "%s" to "%s"',
                  username, configDescription[origin_config], configDescription[changed_config]);
      }
    }
    callback(null, content);
  };

  BoardCRUD.prototype._read = function(data, callback) {
    if (data) {
      if (data._id && typeof (data._id) === 'string') {
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
      this.modelClass.find({}, callback);
    }
  };

  BoardCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data._id; // _id is not modifiable
    var origin_data = data.original;
    var change_fields = [];
    var key;
    for (key in origin_data) {
      if (origin_data.hasOwnProperty(key)) {
        change_fields.push(key);
      }
    }
    delete data.original;

    this.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
      if (err) {
        callback(err, updatedData);
      } else {
        // create activity log
        if (change_fields.length >= 1) {
          async.map(change_fields, function(change_field, cb) {
            var changeInfo = {
              field: change_field,
              origin_data: origin_data,
              changed_data: updatedData
            };
            self.generateActivityContent(self.key, 'update', changeInfo,
              function(err, content) {
                if (err) {
                  cb(err, updatedData);
                } else {
                  if (content) {
                    self.logActivity(content);
                  }
                }
              });
          }, function(err, results) {
            if (err) {
              callback(err, updatedData);
            }
          });
        }

        // All custom actions are written here.
        // It's a bad way. Signal might be better.

        if (data.hasOwnProperty("isClosed")) {
          if (updatedData.isClosed) {
            self.emitMessage(name, updatedData);
          }
          self._boardNotification(updatedData);
          self._logActivityWhenCloseOpen(updatedData);
        } else {
          self.emitMessage(name, updatedData);
        }
      }
    });

    BoardCRUD.prototype._boardNotification = function(board) {
      var boardId = board._id;
      async.waterfall([
        function(callback) {
          BoardMemberRelation.getBoardMembers(boardId, function(err, memberRelations) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, memberRelations);
            }
          });
        }
      ], function(err, memberRelations) {
        if (err) {
          console.log(err);
        } else {
          var type = "information";
          var user = self.socket.handshake.user;
          var message = '', email_message = '';
          if (board.isClosed === true) {
            message = util.format('Board [%s](%s) is closed by %s',
                          board.title, board.url, user.username);
            email_message = util.format('Board %s(%s) is closed by %s',
                          board.title, Sites.currentSite() + board.url, user.username);
          }
          if (board.isClosed === false) {
            message = util.format('Board [%s](%s) is opened by %s',
                          board.title, board.url, user.username);
            email_message = util.format('Board %s(%s) is opened by %s',
                          board.title, Sites.currentSite() + board.url, user.username);
          }
          var numberOfRelations = memberRelations.length;
          var i;
          for (i = 0; i < numberOfRelations; i++) {
            var memberRelation = memberRelations[i];
            // Do not send notification to the one who are closing the board.
            var isWhoClosing = utils.idEquivalent(memberRelation.userId._id, user._id);
            if (!isWhoClosing) {
              var emailContext = {
                body: {
                  username: memberRelation.userId.username,
                  message: email_message
                },
                template: "notification.jade"
              };
              Notification.notify(self.socket, memberRelation.userId, message, type, emailContext);
            }
          }
        }
      });
    };

    BoardCRUD.prototype._logActivityWhenCloseOpen = function(board) {
      var self = this;
      var username = this.handshake.user.username;
      var content = '';
      if (board.isClosed) {
        content = util.format('Board "%s" is closed by %s', board.title, username);
      }
      if (board.isClosed === false) {
        content = util.format('Board "%s" is opened by %s', board.title, username);
      }
      var activity = new LogActivity({
        socket: self.socket,
        exceptMe: self.exceptMe
      });
      activity.log({'content': content, 'boardId': board._id});
    };

  };

  module.exports = BoardCRUD;

}(module));
