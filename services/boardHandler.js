/*
 * Board relative REST API
 *
 */
(function(exports) {

  var mongoose = require('mongoose');
  var Board = require('./../models/board');
  var List = require('./../models/list');
  var Card = require('./../models/card');
  var User = require('./../models/user');
  var BoardMemberRelation = require('./../models/boardMemberRelation');
  var BoardMemberStatus = require('./../models/boardMemberStatus');
  var async = require('async');
  var Schema = mongoose.Schema;
  var ObjectId =  Schema.ObjectId;
  var signals = require('../sockets/signals');
  var settings = require('../settings');

  exports.createBoard = function(user, callback) {

    async.waterfall([
      function(callback) {
        var newBoard = new Board({title: settings.newBoardTitle, creatorId: user.id});
        newBoard.save(function(err, board) {
          callback(err, board, user);
        });
      },
      function(board, member, callback) {
        var newMember = new BoardMemberRelation({
          boardId: board.id,
          userId: member.id,
          status: "available"
        });
        newMember.save(function(err, member) {
          callback(err, board, member.userId);
        });
      },
      function(board, userId, callback) {
        List.create([
          {title: "To Do", boardId: board.id, creatorId: userId, order: 65535},
          {title: "Doing", boardId: board.id, creatorId: userId, order: 131071},
          {title: "Done", boardId: board.id, creatorId: userId, order: 196607}
        ],
          function(err, todoList, doingList, doneList) {
            callback(err, board);
          });
      }
    ], function (err, board) {
      if (err) { return callback(err, null); }

      /*
       * When a board is created here, no socket can be provided due to this
       * operation happens in an AJAX request-response process.
       */
      signals.post_create.send(board, {instance: board, socket: undefined});

      callback(null, board.id);
    });

  };

  /**
   *  Board list page
   *  1.board type:
   *  private board
   *  public board
   *  invited board
   *
   */

  exports.listMyBoards = function(user, callback) {

    async.waterfall([
      function(callback) {
        BoardMemberRelation.getInvitedBoardsByMember(user.id, function(err, invitedBoardIds) {
          callback(err, invitedBoardIds, user);
        });
      },
      function(invitedBoardIds, member, callback) {
        Board.find({'isClosed': false}).or([
          {
            'creatorId': member.id
          },
          {
            '_id': {$in: invitedBoardIds}
          }
        ]).
          populate('creatorId', 'displayName').
          sort('-updated -created').
          exec(function(err, myBoards) {
            callback(err, myBoards);
          });
      }
    ], function (err, result) {
      callback(null, result);
    });
  };

  //Deprecated api
  exports.listInvitedBoards = function(user, callback) {
    async.waterfall([
      function(callback) {
        BoardMemberRelation.getInvitedBoardsByMember(user.id, function(err, invitedBoardIds) {
          callback(err, invitedBoardIds);
        });
      },
      function(invitedBoardIds, callback) {
        Board.find({ _id : {$in: invitedBoardIds}, 'isClosed': false}).
          populate('creatorId', 'displayName').
          sort('-updated -created').
          exec(function(err, invitedBoards) {
            callback(err, invitedBoards);
          });
      }
    ], function(err, result) {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
    });
  };

  exports.listPublicBoards = function(user, callback) {
    async.waterfall([
      function(callback) {
        //query public boards
        Board.find({ 'isPublic': true, 'isClosed': false}).
          populate('creatorId', 'displayName').
          sort('-updated -created').
          exec(function(err, publicBoards) {
            callback(null, publicBoards);
          });
      }
    ], function(err, result) {
      // return public boards list.
      callback(null, result);
    });
  };

  exports.listClosedBoards = function(user, callback) {
    async.waterfall([
      function(callback) {
        // query board list whose board member is user
        BoardMemberRelation.getInvitedBoardsByMember(user.id, function(err, boardIds) {
          callback(err, user, boardIds);
        });
      },
      function(member, boardIds, callback) {
        //query closed boards
        Board.find({_id: {$in: boardIds}, 'isClosed': true}).
          populate('creatorId', 'displayName').
          sort('-updated -created').
          exec(function(err, closedBoards) {
            callback(null, closedBoards);
          });
      }
    ], function(err, result) {
      callback(null, result);
    });
  };

  exports.archivedCards = function(boardId, callback) {
    async.waterfall([
      function(callback) {
        Card.find({'isArchived': true, 'boardId': boardId}).
          exec(function(err, archivedCards) {
            callback(null, archivedCards);
          });
      }
    ], function(err, archivedCards) {
      callback(null, archivedCards);
    });
  };

  exports.archivedLists = function(boardId, callback) {
    async.waterfall([
      function(callback) {
        // query archived lists
        List.find({'boardId': boardId, isArchived: true}).
          exec(function(err, lists) {
            callback(null, lists);
          });
      }
    ], function(err, archivedLists) {
      callback(null, archivedLists);
    });
  };

  exports.getOrderCollectionFromList = function(listId, callback) {
    async.waterfall([
      function(callback) {
        // query cards collection from listId
        Card.find({'listId': listId, isArchived: false}).
          exec(function(err, cards) {
            callback(null, cards);
          });
      }
    ], function(err, result) {
      callback(null, result);
    });
  };

  exports.boardExists = function(boardId, callback) {
    async.waterfall([
      function(callback) {
        // query board
        Board.findById(boardId).
          exec(function(err, board) {
            callback(null, board);
          });
      }
    ], function(err, board) {
      callback(null, board);
    });
  };

  exports.cardExists = function(cardId, callback) {
    async.waterfall([
      function(callback) {
        // query card
        Card.findById(cardId).
          exec(function(err, card) {
            callback(null, card);
          });
      }
    ], function(err, card) {
      callback(null, card);
    });
  };

}(exports));
