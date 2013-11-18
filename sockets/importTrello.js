(function(exports) {
  "use strict";

  // expose variable
  var async = require("async");
  var util = require("util");
  var stdlib = require("./stdlib");
  var mongoose = require('mongoose');
  var User = require("../models/user");
  var Board = require("../models/board");
  var List = require("../models/list");
  var Card = require("../models/card");
  var LogActivity = require("../services/activity").Activity;

  exports.init = function(socket) {

    socket.on('import-trello-complete', function(data) {
      var eventRoomName = "board:" + data.boardId;
      var eventName = 'alert-import-trello-complete';
      var user = socket.getCurrentUser();
      // record import action into activity log
      var content = user.username + ' has imported new content to this board.';
      var activity = new LogActivity({socket: socket, exceptMe: false});
      activity.log({
        'content': content,
        'creatorId': user.id,
        'boardId': data.boardId
      });
      socket.broadcast.to(eventRoomName).emit(eventName, {});
    });
  };

}(exports));
