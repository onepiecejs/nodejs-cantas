
'use strict';

var async = require('async');
var assert = require('assert');
var mongoose = require('mongoose');
var http = require('http');
var io = require('socket.io')
var ioc = require('../../node_modules/socket.io/node_modules/socket.io-client');

var CommentCRUD = require('../../sockets/crud/comment');
var signals = require('../../sockets/signals');
var User = require('../../models/user');
var Comment = require('../../models/comment');
var dbinit = require('./dbinit');

function Room (socket) {
  this.socket = socket;
  this.board = null;
}

Room.prototype.emit = function (eventName, eventData, options) {
  this.socket.emit(eventName, eventData);
}

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

describe('Test card comments', function() {

  var cardId = '519446863d26ff5828000012';
  var authorId = '516e4e65bcee1e5558000001';
  var srv, sio, socket;

  beforeEach(function(){
    srv = http.Server();
    socket = client(srv);
    sio = io.listen(srv);

    sio.on('connection', function(s){
      s.room = new Room(s);
      var hs = s.handshake;
      hs.user = {_id: authorId};
      var obj = new CommentCRUD({socket: s, handshake: hs});
      obj.listen();
    });
  });

  afterEach(function(){
    srv.close();
  });

  it('Test add comment', function(done) {
    var commentData = {content: 'test add comment', cardId: cardId, authorId: authorId};
    srv.listen(function(){
      socket.on('connect', function(){
        socket.on('/comment:create', function(data){
          Comment.findOne(commentData, function(err, comment){
            if(!err){
              assert.strictEqual(data._id, comment.id);
              done();
            }
          });
        });

        signals.post_create.disconnect(Comment);

        socket.emit('comment:create', commentData);
      });
    });
  });

  it('Test edit comment', function(done) {
    var commentData = {content: 'test add comment', cardId: cardId, authorId: authorId};

    async.waterfall([
      function(callback){
        var comment = new Comment(commentData);
        comment.save(function(err, c){
          callback(err, c);
        });
      }
    ], function(err, result){
      if(!err){
        var commentId = result.id;
        var name = '/comment/' + commentId + ':update';
        var newContent = 'test edit commnet';

        srv.listen(function(){
          socket.on('connect', function(){
            socket.on(name, function(data){
              assert.strictEqual(typeof data, 'object');
              assert.strictEqual(data.content, newContent);
              done();
            });

            signals.post_patch.disconnect(Comment);

          });
          socket.emit('comment:patch', {_id: commentId, content: newContent});
        });
      }
    });
  });
});

