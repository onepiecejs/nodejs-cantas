
var http = require('http').Server;
var io = require('socket.io');
var ioc = require('../../node_modules/socket.io/node_modules/socket.io-client');
var request = require('supertest');
var expect = require('expect.js');
var boardMove = require('../../sockets/boardMove');
var async = require('async');

var Board = require('../../models/board');
var List = require('../../models/list');
var Card = require('../../models/card');
var mongoose = require('mongoose');
var dbinit = require('./dbinit');
var SocketPatch = require("../../sockets/patch_socket");

function Room (socket) {
  this.socket = socket;
  this.board = null;
}

Room.prototype.emit = function (eventName, eventData, options) {
  this.socket.emit(eventName, eventData);
};

// creates a socket.io client for the given server
function client(srv, nsp, opts){
  if ('object' == typeof nsp) {
    opts = nsp;
    nsp = null;
  }
  var addr = srv.address();
  if (!addr) addr = srv.listen().address();
   var url = 'ws://' + addr.address + ':' + addr.port + (nsp || '');
   return ioc.connect(url, opts);
}

describe('Test cardMove', function(){

  var moveData = {boardId: "51cc7101a1437a0000000001",
                  listId: "51cc7101a1437a0000000005",
                  cardId: "51ce95201569da560c000005",
                  position: 1};

  var boardOne = null;
  var listOne = null;
  var listTwo = null;
  var cardOne = null;

  it('should receive card-move events', function(done) {
    var srv = http();
    var sio = io.listen(srv);
    srv.listen(function(){
      var socket = client(srv);
      sio.on('connection', function(s){
        s.on('card-move', function(data){
          expect(data.boardId).to.be("51cc7101a1437a0000000001");
          expect(data.position).to.be(1);
          done();
        });
        socket.emit('card-move', moveData);
      });
    });
  });

  it('should move card from listOne to listTwo in same board', function(done) {
    async.series([
      function(callback) {
        boardOne = new Board({
          title: 'move card test',
          isClosed: false,
          creatorId: '4eea50bc91e31d174600016d',
          isPublic: true
        });

        boardOne.save(function(err) {
          callback(err, boardOne);
        });
      },
      function(callback) {
        listOne = new List({
          title: 'Doing',
          boardId: boardOne.id,
          creatorId: '4eea50bc91e31d174600016d',
          order: 65535
        });
        listOne.save(function(err) {
          callback(err, listOne);
        });
      },
      function(callback) {
        listTwo = new List({
          title: 'Todo',
          boardId: boardOne.id,
          creatorId: '4eea50bc91e31d174600016d',
          order: 131071
        });
        listTwo.save(function(err) {
          callback(err, listTwo);
        });
      },
      function(callback) {
        cardOne = new Card({
          title: 'test card-move',
          boardId: boardOne.id,
          listId: listOne.id,
          creatorId: '4eea50bc91e31d174600016d',
          order: 65535
        });

        cardOne.save(function(err) {
          callback(err, cardOne);
        });
      }
    ],
      function(err, results) {
        if(err) {
          throw Error('cardMove test err:'+err);
        }


        moveData = {
          boardId: boardOne.id,
          listId: listTwo.id,
          cardId: cardOne.id,
          position: 1
        };
        var srv = http();
        var sio = io.listen(srv);
        var roomName = 'board:' + boardOne.id;
        srv.listen(function(){
          var socket = client(srv);
          var eventName = '/card/' + cardOne.id + ':update';
           sio.on('connection', function(s){
             s.room = new Room(s);
             //mock a username,board, and patch a getCurrentUser
             s.handshake.user = {username: 'test'};
             s.room.board = 'board:' + boardOne.id;
             SocketPatch.patch(s);

             boardMove.init(s);
             socket.on(eventName, function(data) {
               expect(data.boardId).to.be(boardOne.id);
               setTimeout(function(){
                 Card.findById(cardOne.id, function(err, card) {
                   expect(card.listId.toString()).to.be(listTwo.id);
                   done();
                 });
               },100);
             });

             socket.emit('move-card', moveData);
           });

          
        });
      });
  });

});
