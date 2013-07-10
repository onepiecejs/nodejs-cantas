
(function(module) {

  "use strict";

  module.exports.patch = function(socket) {

    socket.constructor.prototype.getCurrentUser = function() {
      return socket.handshake.user;
    };

    socket.constructor.prototype.getCurrentBoardId = function() {
      return socket.room.board.split(':')[1];
    };

  };
  
}(module));
