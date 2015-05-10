(function (exports) {

  "use strict";

  var connect = require('express/node_modules/connect'),
    parseCookie = connect.utils.parseCookie,
    passport = require('passport'),
    crud = require('./crud'),
    Board = require("../models/board"),
    BoardMembership = require("./boardMembership"),
    BoardMove = require("./boardMove"),
    ImportTrello = require("./importTrello"),
    BoardMemberRelation = require("../models/boardMemberRelation"),
    SocketPatch = require("./patch_socket"),
    Room = require('./room'),
    SyncBugzilla = require("./syncBugzilla");

  exports.Room = Room;

  var onJoinBoard = function (boardId) {
    var socket = this;
    var user = socket.handshake.user;

    Board.joinBoard(user, boardId, socket, function (err, result) {
      if (result.ok === 0) {
        BoardMemberRelation.getBoardMembers(result.board._id, function (err, members) {
          members = members.map(function (member) {
            return member.userId._id.toString();
          });
          var userList = socket.room.joinBoard(boardId);
          userList = userList.map(function (user) {
            user.role = {'name': '', 'desc': ''};
            if (user._id.toString() === result.board.creatorId.toString()) {
              user.role.name = 'admin';
              user.role.desc = 'Admin - full control';
            } else if (members.indexOf(user._id.toString()) !== -1) {
              user.role.name = 'member';
              user.role.desc = 'Member - full control';
            } else {
              user.role.name = 'viewer';
              user.role.desc = 'Viewer - view only';
            }
            return user;
          });

          // boardcasting visitor's activity status
          // FIXME: refactor the workflow of how to determine user's role of board
          userList.forEach(function (user) {
            if (socket.handshake.user._id.toString() === user._id.toString()) {
              var eventRoomName = 'board:' + boardId;
              var eventName = 'user-login:board:' + boardId;
              socket.broadcast.to(eventRoomName).emit(eventName,
                {ok: result.ok, visitor: user, boardId: boardId});
            }
          });

          socket.emit('joined-board', {
            ok: result.ok,
            visitors: userList,
            message: result.message
          });
        });
      } else if (result.ok === 1) {
        socket.emit('joined-board', result);
      }
    });
  };

  var onUserLogout = function(data) {
    var socket = this;
    var currentUser = socket.handshake.user;
    var user = data.user;
    var boardId = data.boardId;
    var eventName = 'user-logout:board:' + boardId;
    var eventRoomName = 'board:' + boardId;
    var myClients = socket.room.myClients();

    //leave board room
    socket.leave(eventRoomName);
    socket.room.board = null;

    if (myClients && myClients.length === 1 && currentUser._id.toString() === user.id.toString()) {
      socket.room.leaveBoard(boardId);
      socket.broadcast.to(eventRoomName).emit(eventName, {ok: 0, visitor: currentUser});
    }
  };

  var onConnection = function (socket) {
    // Let us patch socket first to add our custom and useful behaviors,
    // which will be used in the whole life of Cantas.
    SocketPatch.patch(socket);

    var hs = socket.handshake, sessionID = hs.sessionID;

    // Set up CRUD method for each model
    crud.setUp(socket, hs);

    /**
     * Set a room management instance for this client.
     */
    socket.room = new Room(this, socket);
    socket.sio = this;


    /*
     * When a user joins a board, following steps have to be taken,
     * - validate whether board exists
     * - confirm a user's membership if current user is invited to the board
     *
     * Finally, join current user to board and notify client everything is okay.
     */
    socket.on('join-board', onJoinBoard);

    socket.on('user-logout', onUserLogout);

    //  "disconnect" is emitted when the socket disconnected
    socket.on('disconnect', function() {
      var myClients = socket.room.myClients();
      if (myClients && myClients.length === 1) {
        socket.room.leaveAllRoom();
      } else {
        socket.leave(socket.room.board);
      }

      // Mark socket is no longer used.
      socket = null;
    });

    // Initialization of backend services, which work upon socket.
    BoardMembership.init(socket);
    BoardMove.init(socket);
    ImportTrello.init(socket);
    SyncBugzilla.init(socket);
  };

  exports.init = function (sio, sessionStore) {

    // Authorization during handshake
    sio.set('authorization', function (data, callback) {
      // Without a cookie that holds the user's session id
      // the user can not be authorized
      if (!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
      }

      data.cookie = parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];

      /*
      Using the session id found in the cookie, find the
      session in Redis.  The authorization will fail if the
      session is not found.
      */
      sessionStore.load(data.sessionID, function (err, session) {
        if (err || !session) {
          return callback('Error', false);
        }
        /**
         * Deserialize a user instance from passport session
         * and set it onto handshake for later re-use.
         */
        var userKey = session.passport.user;
        passport.deserializeUser(userKey, function (err, user) {
          data.user = user;
          callback(null, true);
        });
      });
    });

    sio.on('connection', onConnection);

    require("./signals_registration");

  };

}(exports));
