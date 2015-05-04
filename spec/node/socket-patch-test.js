
"use strict";

var assert = require("assert");
var SocketPatch = require("../../sockets/patch_socket");
var EventEmitter = process.EventEmitter;

// Mock the real Socket class
var Socket = function() {};

Socket.prototype.__proto__ = EventEmitter.prototype;

Socket.prototype.__defineGetter__('handshake', function () {
  return {user: {displayName: "socket user"}};
});


describe("Test socket patch", function() {

  var socket = null;

  beforeEach(function() {
    socket = new Socket();
  });

  afterEach(function() {
    socket = null;
  });

  it("Test patch getCurrentUser", function() {
     SocketPatch.patch(socket);

     assert.notEqual(socket.getCurrentUser, undefined,
                     "getCurrentUser method should exist.");
     assert.equal(socket.handshake.user.displayName,
                  socket.getCurrentUser().displayName,
                  "User's display name does not equal to the one within socket.");
  });

});
