
"use strict";

var assert = require("assert");
var User = require("../../models/user");
var Board = require("../../models/board");

var mongoose = require('mongoose');
var dbinit = require('./dbinit');

describe("Test board member invitation", function() {

  var invitee = null;
  var inviter = null;
  var user3 = null;
  var board = null;

  beforeEach(function(done) {
    async.series([
      function(callback){
        invitee = new User({
          username: "test_user1",
                email: "test_user1@example.com"
        });
        invitee.save(function(err){
          callback(err,invitee);
        });
      },
      function(callback){
        inviter = new User({
          username: "test_user2",
        email: "test_user2@example.com"
        });
        inviter.save(function(err){
          callback(err,inviter);
        });
      },
      function(callback){
        user3 = new User({
          username: "test_user3",
        email: "test_user3@example.com"
        });
        user3.save(function(err){
          callback(err,user3);
        });
      },
      function(callback){
        board = new Board({ title: "Test board", creatorId: inviter.id });
        board.save(function(err){
          callback(err,board);
        });
      }
    ],
      function(err,results){
        if(err || !results){
          throw Error("invitation test:"+err);
        }

        if(results.length) {
          return done();
        }
      });
  });


  // it("Test invite a board member");

  // it("Test find an exist user via username", function(done) {
  //   User.exists('test_user1', function(existence) {
  //     assert.equal(existence, true);
  //     done();
  //   });
  // });

  // it("Test find an non-exist user via username", function(done) {
  //   User.exists("xxx", function(existence) {
  //     assert.equal(existence, false);
  //     done();
  //   });
  // });

  // it("Test get an exist user via username", function(done) {
  //   User.exists("test_user1", function(err, user) {
  //     assert.equal(user.username === invitee.username);
  //     done();
  //   });
  // });

  // it("Test get an non-exist user via username", function(done) {
  //   User.exists("xxx", function(err, user) {
  //     assert.equal(user == null);
  //     done();
  //   });
  // });

});
