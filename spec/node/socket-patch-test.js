
"use strict";

var assert = require("assert");
var SocketPatch = require("../../sockets/patch_socket");

describe("Test socket patch", function() {

  var socket = null;

  beforeEach(function() {
    var Socket = function() {
      this.handshake = {
        user: {username: "socket user"}
      };
    };
    socket = new Socket();
  });

  afterEach(function() {
    socket = null;
  });

  it("Test patch getCurrentUser", function() {
    // SocketPatch.patch(socket);

    // var getCurrentUser = socket.getCurrentUser;
    // assert.notEqual(getCurrentUser, undefined,
    //   "getCurrentUser method should exist.");
    // assert.equal(socket.handshake.user.username, getCurrentUser().username,
    //   "User's username does not equal to the one within socket.");
  });

});
