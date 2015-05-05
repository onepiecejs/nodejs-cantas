
"use strict";

var async = require("async");
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
          displayName: "test_user1",
          email: "test_user1@example.com"
        });
        invitee.save(function(err){
          callback(err,invitee);
        });
      },
      function(callback){
        inviter = new User({
          displayName: "test_user2",
          email: "test_user2@example.com"
        });
        inviter.save(function(err){
          callback(err,inviter);
        });
      },
      function(callback){
        user3 = new User({
          displayName: "test_user3",
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

  afterEach(function(done) {
    async.eachSeries([board, inviter, invitee, user3],
      function(obj, callback) {
        obj.remove(function(err) {
          if (err) { throw err; }
          else { callback(null); }
        });
      },
      function(err) {
        if (err) {
          throw err;
        } else {
          done();
        }
      });
  });

  // it("Test invite a board member");
});
