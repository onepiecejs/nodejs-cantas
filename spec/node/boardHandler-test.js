
'use strict';

var utils = require('../../services/utils.js');
var Board = require('../../models/board');
var List = require('../../models/list');
var BoardMemberRelation = require('../../models/boardMemberRelation');
var BoardMemberStatus = require('../../models/boardMemberStatus');
var User = require('../../models/user');

var boardHandler = require('../../services/boardHandler.js');
var async = require('async');
var expect = require('expect.js');

var mongoose = require('mongoose');
var dbinit = require('./dbinit');

var ObjectId = null;
var member = null;
var myBoard = null;
var invitedBoard = null;
var publicBoard = null;
var closedBoard = null;
var boardMemberRelation = null;


describe('BoardHandler', function() {

  beforeEach(function(done) {
    member = new User({
      username: 'dxiao',
      email: 'dxiao@redhat.com'
    });
    member.save(function(err) {
      done();
    });
  });


  it('#createBoard with nonexistent username, it should return a invalid boardId', function(done) {
    boardHandler.createBoard('test', function(err, board) {
      expect(null).to.be(board)
      done();
    });
  });

  it('#createBoard with valid username, it should return a valid boardId', function(done) {
    boardHandler.createBoard(member.username, function(err, idBoard) {
      var isValid = utils.checkForHexRegExp.test(idBoard);
      expect(isValid).to.be(true);
      done();
    });
  });

});


describe("BoardHandler API", function() {

  beforeEach(function(done) {

    async.series([
    function(callback){
      member = new User({
        username: 'dxiao',
        email: 'dxiao@redhat.com'
      });
      member.save(function(err){
        callback(err, member);
      });
    },
    function(callback) {
      myBoard = new Board({
        title: "test myBoard",
        isClosed: false,
        creatorId: member.id,
        isPublic: false
      });

      myBoard.save(function(err){
        callback(err,myBoard);
      });
    },
    function(callback) {
      invitedBoard = new Board({
        title: "test invitedBoard",
        isClosed: false,
        creatorId: "4eea50bc91e31d174600016d",
        isPublic: false
      });

      invitedBoard.save(function(err){
        callback(err,invitedBoard);
      });
    },

    function(callback) {
      boardMemberRelation = new BoardMemberRelation({
        boardId: invitedBoard.id,
        userId: member.id,
        status: BoardMemberStatus.available
      });

      boardMemberRelation.save(function(err){
        callback(err,boardMemberRelation);
      });
    },

    function(callback) {
      publicBoard = new Board({
        title: "test publicBoard",
        isClosed: false,
        creatorId: "4eea50bc91e31d174600016d",
        isPublic: true
      });

      publicBoard.save(function(err){
        callback(err, publicBoard);
      });
    },

    function(callback){
      closedBoard = new Board({
        title: "test closedBoard",
        isClosed: true,
        creatorId: "4eea50bc91e31d174600016d",
        isPublic: true
      });

      closedBoard.save(function(err){
        callback(err,closedBoard);
      });
    },

    function(callback) {
      boardMemberRelation = new BoardMemberRelation({
        boardId: closedBoard.id,
        userId: member.id,
        status: BoardMemberStatus.available
      });

      boardMemberRelation.save(function(err){
        callback(err,boardMemberRelation);
      });
    }
    ],
      function(err,results){
        if(err || !results){
          throw Error("boardHandler test:"+err);
        }
        if(results.length) return done();
      });
  });


  it('#listMyBoards should return my boards list', function(done) {
    boardHandler.listMyBoards(member.username, function(err, boards) {
      var targets = [];
      targets.push(myBoard);
      targets.push(invitedBoard);
      expect(boards.length).to.eql(2);
      done();
    });
  });

  it('#listInvitedBoards should return invited boards list', function(done) {
    boardHandler.listInvitedBoards(member.username, function(err, boards) {
      var targets = [];
      targets.push(invitedBoard);
      expect(boards.length).to.eql(1);
      done();
    });
  });

  it('#listPublicBoards should return public boards list', function(done) {
    boardHandler.listPublicBoards(member.username, function(err, boards) {
      var targets = [];
      targets.push(publicBoard);
      expect(boards.length).to.eql(1);
      done();
    });
  });

  it('#listClosedBoards should return closed boards list', function(done) {
    boardHandler.listClosedBoards(member.username, function(err, boards) {
      var targets = [];
      targets.push(closedBoard);
      expect(boards.length).to.eql(1);
      done();
    });
  });

});
