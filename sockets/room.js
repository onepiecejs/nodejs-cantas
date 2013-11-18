
(function (module) {

  'use strict';

  function Room(io, socket) {
    this.io = io;
    /**
     * Set an internal reference of the client socket.
     */
    this.socket = socket;
    // Only one board is supposed to be accessed in one connection
    this.board = null;
  }

  Room.prototype.boardIdToRoomName = function (boardId) {
    return ('board:' + boardId);
  };

  Room.prototype.joinBoard = function (boardId) {
    /**
     * Join a user to a room that represents a board.
     * Return a list of 'users' currently in this room.
     * 'users' should be a list of User instance,
     * but there should be some setup on connection
     */
    var roomName = this.boardIdToRoomName(boardId);
    this.socket.join(roomName);
    this.board = roomName;
    var members = this.io.sockets.clients(roomName);
    var userList = [];
    var index;
    for (index = 0; index < members.length; index++) {
      var member = members[index];
      userList.push(member.handshake.user.toJSON());
    }
    return userList;
  };

  Room.prototype.leaveBoard = function (boardId) {
    var roomName = this.boardIdToRoomName(boardId);
    this.socket.leave(roomName);
    this.board = null;
  };

  Room.prototype.myRooms = function () {
    return this.io.sockets.manager.roomClients[this.socket.id];
  };

  // list all clients in one board room
  Room.prototype.allClients = function() {
    return this.io.sockets.clients(this.board);
  };

  // list all my clients in one board room
  Room.prototype.myClients = function() {
    var that = this;
    var clients = this.allClients();
    var myClients = [];
    clients.forEach(function(client) {
      if (that.socket.handshake.user.id === client.handshake.user.id) {
        myClients.push(client);
      }
    });
    return myClients;
  };

  /*
   * leave all room and return boardID list
   */
  Room.prototype.leaveAllRoom = function () {
    this.socket.room.emit('user-leave-all-room', {ok: 0, visitor: this.socket.handshake.user});
    var rooms = this.myRooms();
    var index;
    for (index in rooms) {
      if (rooms.hasOwnProperty(index)) {
        this.socket.leave(rooms[index]);
      }
    }
  };

  Room.prototype.crudAudiences = function () {
    /**
     * Return room names that a CRUD event should
     * be emitted into.
     */
    return this.board;
  };

  Room.prototype.emit = function (eventName, eventData, options) {
    /**
     * Call .emit for its socket.
     */
    if (options !== undefined && options.exceptMe) {
      this.socket.broadcast.to(this.board).emit(eventName, eventData);
    } else {
      this.io.sockets.in(this.board).emit(eventName, eventData);
    }
  };

  module.exports = Room;

}(module));

