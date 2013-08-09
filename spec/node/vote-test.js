
'use strict';

var async = require('async');
var expect = require('expect.js');
var http = require('http');
var io = require('socket.io');
var ioc = require('socket.io/node_modules/socket.io-client');

var Vote = require('../../models/vote');

var VoteCRUD = require('../../sockets/crud/vote');
var signals = require('../../sockets/signals');

var sinon = require('sinon');

var dbinit = require('./dbinit');

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

describe('Test card votes', function() {
  var authorId = '51b9789ca2c0be0d44000001';
  var cardId = "51b97b6cd17d023144000019";
  var server;
  var sio;
  var socket;

  beforeEach(function() {
    server = http.Server();
    socket = client(server);
    sio = io.listen(server);

    sio.on('connection', function(s) {
      s.room = new Room(s);
      var voteCrud = new VoteCRUD({
        socket: s,
        handshake: s.handshake
      });

      var stub = sinon.stub(voteCrud, '_canVote');
      stub.callsArgWith(0, null, true);

      voteCrud.listen();
    });
  });

  afterEach(function() {
    server.close();
  });

  it('Test add vote', function(done) {
    var voteData = {yesOrNo: true, cardId: cardId, authorId: authorId};

    server.listen(function() {
      socket.on('connect', function() {
        socket.on('/vote:create', function(data) {
          Vote.findOne(voteData, function(err, vote) {
            if (err) {
              throw Error('Test add vote error:' + err);
            } else {
              expect(data._id).to.be(vote.id);
              done();
            }
          });
        });

        socket.emit('vote:create', voteData);
      });
    });
  });

  it('Test change vote agree to disagree', function(done) {
    var voteData = {yesOrNo: true, cardId: cardId, authorId: authorId};

    async.waterfall([
      function(callback) {
        var vote = new Vote(voteData);

        vote.save(function(err, v) {
          callback(err, v);
        });
      }
    ], function(err, vote) {
      if (err) {
        throw Error('Test change vote error:' + err);
      } else {
        var voteId = vote.id;
        var eventName = '/vote/' + voteId + ':update';
        var voteNo = false;

        server.listen(function() {
          socket.on('connect', function() {
            socket.on(eventName, function(data) {
              expect(data.yesOrNo).to.be(voteNo);
              expect(data.updatedOn).not.to.be(vote.createdOn);
              done();
            });

            socket.emit('vote:patch', {_id: voteId, yesOrNo: voteNo});
          });
        });
      }
    });
  });

  it('Test delete vote', function(done) {
    var voteData = {yesOrNo: true, cardId: cardId, authorId: authorId};

    async.waterfall([
     function(callback) {
       var vote = new Vote(voteData);

       vote.save(function(err, v) {
         callback(err, v);
       });
     }
    ], function(err, vote) {
      if (err) {
        throw Error('Test delete vote err:' + err);
      } else {
        var voteId = vote.id;
        var eventName = '/vote/' + voteId + ':delete';

        server.listen(function() {
          socket.on('connect', function() {
            socket.on(eventName, function(data) {
              Vote.findById(voteId, function(err, v) {
                if (err) {
                 throw Error('Test delete vote err:' + err);
                } else {
                  expect(v).to.be(null);
                  done();
                }
              });
            });

            socket.emit('vote:delete', {_id: voteId});
          });
        });
      }
    });
  });

});
