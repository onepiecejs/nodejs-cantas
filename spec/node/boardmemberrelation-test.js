
"use strict";

var assert = require("assert");
var async = require("async");
var mongoose = require("mongoose");
var BoardMemberRelation = require("../../models/boardMemberRelation");
var Board = require("../../models/board")
var MemberStatus = require('../../models/boardMemberStatus');
var User = require("../../models/user");

var dbinit = require('./dbinit');

describe("Test board member relation", function() {

  var user1 = null, user2 = null, user3 = null, user4 = null;
  var boardCreator1 = null, boardCreator2 = null;
  var board1 = null, board2 = null;
  var memberRelations = null;

  beforeEach(function(done) {
    async.series([
      function(callback) {
        user1 = new User({username: "user1", email: "user1@redhat.com"});
        user1.save(function(err, user) {
          callback(err || null, err !== null);
        });
      },
      function(callback) {
        user2 = new User({username: "user2", email: "user2@redhat.com"});
        user2.save(function(err, user) {
          callback(err || null, err !== null);
        });
      },
      function(callback) {
        user3 = new User({username: "user3", email: "user3@redhat.com"});
        user3.save(function(err, user) {
          callback(err || null, err !== null);
        });
      },
      function(callback) {
        user4 = new User({username: "user4", email: "user4@redhat.com"});
        user4.save(function(err, user) {
          callback(err || null, err !== null);
        });
      },
      function(callback) {
        boardCreator1 = new User({username: "bcUser1", email: "bcuser1@redhat.com"});
        boardCreator1.save(function(err, user) {
          board1 = new Board({title: "Test board1", creatorId: user._id});
          board1.save(function(err, user) {
            callback(err || null, err !== null);
          });
        });
      },
      function(callback) {
        boardCreator2 = new User({username: "bcUser2", email: "bcuser2@redhat.com"});
        boardCreator2.save(function(err, user) {
          board2 = new Board({title: "Test board2", creatorId: user._id});
          board2.save(function(err, user) {
            callback(err || null, err !== null);
          });
        });
      }
    ], function(err, results) {
      if (err) {
        done();
        return;
      }
      // After users and boards are ceated, to build the relation between them.
      async.series([
        // user1, user2 and user3 are member of board1
        function(callback) {
          new BoardMemberRelation({
            boardId: board1._id, userId: user1._id, status: MemberStatus.inviting
          }).save(function(err, relation) {
            callback(err || null, err ? null : relation);
          });
        },
        function(callback) {
          new BoardMemberRelation({
            boardId: board1._id, userId: user2._id, status: MemberStatus.available
          }).save(function(err, relation) {
            callback(err || null, err ? null : relation);
          });
        },
        function(callback) {
          new BoardMemberRelation({
            boardId: board1._id, userId: user3._id, status: MemberStatus.kickedOff
          }).save(function(err, relation) {
            callback(err || null, err ? null : relation);
          });
        },
        // user4 is member of board2
        function(callback) {
          new BoardMemberRelation({
            boardId: board2._id, userId: user4._id, status: MemberStatus.kickedOff
          }).save(function(err, relation) {
            callback(err || null, err ? null : relation);
          });
        }
      ], function(err, results) {
        memberRelations = results;
        done();
      });
    });
  });

  afterEach(function(done) {
    var arrToRemove = memberRelations.concat([
      user1, user2, user3, user4,
      board1, board2,
      boardCreator1, boardCreator2
    ]);
    async.mapSeries(arrToRemove,
      function(item, callback) {
        item.remove(function(err, itemRemoved) {
          if (err)
            callback(err, null);
          else
            callback(null, itemRemoved);
        });
      },
      function(err, results) {
        if (err)
          throw err;

        done();
      });
  });

  it("Test get board members, available and inviting.", function(done) {
    BoardMemberRelation.getBoardMembers(board1._id, function(err, memberRelations) {
      async.map(memberRelations,
        function(item, callback) {
          callback(null, item.userId.username);
        },
        function(err, results) {
          // results contains all users within member relations returned by
          // getBoardMembers
          assert(results.indexOf(user1.username) >= 0,
             "user1 should be a member of board \"" + board1.title +
             "\", whose status is inviting.");
          assert(results.indexOf(user2.username) >= 0,
            "user2 should be a member of board \"" + board1.title +
            "\", whose status is available.");

          done();
        });
    });
  });

  it("Test whether user is board member.", function(done) {
    var usersToCheck = [user1, user2, user3];
    var expectedResults = [true, true, false];
    async.map(usersToCheck,
      function(user, callback) {
        BoardMemberRelation.isBoardMember(user._id, board1._id, function(err, result) {
          if (err)
            throw err;
          callback(null, result);
        });
      },
      function(err, results) {
        for (var i = 0; i < usersToCheck.length; i++) {
          var userToCheck = usersToCheck[i];
          var result = results[i];
          var expected = expectedResults[i];
          assert.equal(result, expected,
            userToCheck.username + "'s member relation should be " + expected);
        }
        done();
      });
  });

  it("Test a user kicked out is not board member", function(done) {
    BoardMemberRelation.isBoardMember(user3._id, board1._id, function(err, result) {
      if (err)
        throw err;

      assert.equal(result, false,
        "user3's status is kickedOff, it should be a member of board1.");

      done();
    });
  });

  it("Test a user not has relation with a board is not a board member", function(done) {
    BoardMemberRelation.isBoardMember(user4._id, board2._id, function(err, result) {
      if (err)
        throw err;

      assert.equal(result, false,
        "user4 has no relation with board1. So, it should be a member of board1.");

      done();
    });
  });

  it("Test creator of a board is also a board member.", function(done) {
    BoardMemberRelation.isBoardMember(boardCreator1, board1._id, function(err, result) {
      if (err)
        throw err;

      assert(result,  
        "boardCreator1 is the creator of board1, and it should be a member of board1 therefor.");

      done();
    });
  });

  it("Test revoke board membership from a user", function(done) {
    BoardMemberRelation.revoke(user1._id, board1._id, function(err, relation) {
      assert(!err,
        "Revoke board membership of user " + user1.username +
        " from board " + board1 + " should succeed.");

      var condition = {userId: user1._id, boardId: board1._id};
      BoardMemberRelation.findOne(condition, function(err, relation) {
        if (err)
          throw err;

        assert.notEqual(relation, null,
          "Revoking board membership just changes the status rather than deleting.");
        assert.notStrictEqual(typeof relation.quitOn, "string",
          "After revoking, quitOn should not be the default value, an empty string.");
        assert.strictEqual(relation.status, MemberStatus.kickedOff,
          "After revoking, status is not changed to kickedOff.");

        done();
      });
    });
  });

});
