
"use strict";

var async = require('async');
var expect = require('expect.js');
var http = require('http');
var io = require('socket.io');
var ioc = require('socket.io/node_modules/socket.io-client');

var Board = require("../../models/board");
var Card = require("../../models/card");
var Checklist = require("../../models/checklist");
var ChecklistItem = require("../../models/checklistItem");
var List = require("../../models/list");
var User = require("../../models/user");

var ChecklistItemCRUD = require("../../sockets/crud/checklistItem");
var signals = require("../../sockets/signals");

var sinon = require("sinon");

function Room(socket) {
  this.socket = socket;
  this.board = null;
}

Room.prototype.emit = function(eventName, eventData, options) {
  this.socket.emit(eventName, eventData);
}

function client(srv, nsp, opts) {
  if ('object' == typeof nsp) {
    opts = nsp;
    nsp = null;
 }
  var addr = srv.address();
  if (!addr) addr = srv.listen().address();
  var url = 'ws://' + addr.address + ':' + addr.port + (nsp || '');
  return ioc.connect(url, opts);
}

describe("Test checklistItem", function() {
  var authorId = '51b9789ca2c0be0d44000001';
  var cardId = "51b97b6cd17d023144000019";
  var checklistId = "51c2774ab6845b3e50000001";
  var server;

  beforeEach(function() {
    server = http.Server();
    var sio = io.listen(server);
    sio.on('connection', function(s) {
      s.room = new Room(s);
      var checklistItemCrud = new ChecklistItemCRUD({
        socket: s,
        handshake: s.handshake
      });

      // stub checklistItemCrud.isBoardMember() and return true
      var stub = sinon.stub(checklistItemCrud, "isBoardMember");
      stub.callsArgWith(0, null, true);

      checklistItemCrud.listen();
    });
  });

  it('Test edit checklistItem', function(done) {
    async.waterfall([
      function(callback) {
        var checklistItem = new ChecklistItem({
          content: "test_checklistItem",
          checklistId: checklistId,
          cardId: cardId,
          authorId: authorId
        });
        checklistItem.save(function(err, checklistItem) {
          callback(err, checklistItem);
        });
      }
    ],
    function(err, checklistItem) {
      if(err) {
        throw Error('checklistItem test err:' + err);
      } else {

          var eventName = '/checklistitem/' + checklistItem.id + ':update';
          var newContent = 'update content of checklistItem';

          server.listen(function() {

            var socket = client(server);
            socket.on(eventName, function(data) {
              expect(data.content).to.be(newContent);
              expect(data.updatedOn).not.to.be(checklistItem.createdOn);
            });

            signals.post_patch.disconnect(ChecklistItem);
            socket.emit('checklistitem:patch', {_id: checklistItem.id, content: newContent});

          });

      }
    });
    done();
  });
});

