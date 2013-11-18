(function(module) {

  "use strict";

  var ActivityModel = require("../models/activity");

  /*
   * Base class for Activities.
   *
   * An Activity is an action happened in a specific board by users.
   * And all other users being in that board would receive the activity in
   * real-time.
   */
  function Activity(options) {
    var _options = options || {};

    this.socket = _options.socket;
    this.notTellMe = _options.exceptMe === undefined ? true : _options.exceptMe;

    // Used for send actvity back to all clients within the board.
    // This socket event name follows the specification talking with client.
    this.eventName = "/activity:create";
  }

  /*
   * Log this activity and send it to others within the board.
   */
  Activity.prototype.log = function(data) {
    if (!data) {
      return;
    }

    var content = data.content;
    if (!content) {
      throw new Error("Missing activity's content");
    }

    var self = this;
    var currentUser = this.socket.getCurrentUser();
    var currentBoardId = this.socket.getCurrentBoardId();


    var creatorId = data.creatorId || currentUser._id;
    var boardId = data.boardId || currentBoardId;

    new ActivityModel({
      'content': content,
      'creatorId': creatorId,
      'boardId': boardId
    }).save(function(err, savedActivity) {
      if (err) {
        console.log(err);
      } else {
        if (boardId === currentBoardId) {
          self.socket.room.emit(
            self.eventName,
            savedActivity,
            {exceptMe: self.notTellMe}
          );
        } else {
          var eventRoomName = "board:" + boardId;
          self.socket.broadcast.to(eventRoomName).emit(
            self.eventName,
            savedActivity,
            {exceptMe: self.notTellMe}
          );
        }
      }
    });

  };

  module.exports.Activity = Activity;

}(module));
