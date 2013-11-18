
(function(module) {

  "use strict";

  module.exports.patch = function(socket) {

    socket.constructor.prototype.getCurrentUser = function() {
      return this.handshake.user;
    };

    socket.constructor.prototype.getCurrentBoardId = function() {
      if (this.room.board && this.room.board.length >= 2) {
        return this.room.board.split(':')[1];
      }
      return null;
    };

  };

}(module));
