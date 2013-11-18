(function(exports) {
  "use strict";

  // expose variable
  var async = require("async");
  var util = require("util");
  var stdlib = require("./stdlib");
  var mongoose = require('mongoose');
  var User = require("../models/user");
  var Board = require("../models/board");
  var List = require("../models/list");
  var Card = require("../models/card");
  var CardSourceRelation = require("../models/cardSourceRelation");
  var SyncConfig = require("../models/syncConfig");
  var MemberRelation = require("../models/boardMemberRelation");
  var LogActivity = require("../services/activity").Activity;

  exports.init = function(socket) {
    //calc the move card's order
    var _updateMoveCardOrder = function(data, origCard, targetCardOrders, origList) {
      var order = 65536 - 1;
      var moveIndex = data.position >= 0 ? (data.position - 1) : 0;
      var lastIndex = targetCardOrders.length === 0 ? 0 : (targetCardOrders.length - 1);
      var cardCount = targetCardOrders.length;
      var origListId = origCard.listId;
      var newListId = data.listId;
      var isSameList = (origListId.toString('utf-8') === newListId.toString('utf-8'));
      var movetoOrder, beforeOrder, afterOrder;

      // either in one list or move to new list
      // 1.move card to new list, the list have no card right now.
      if (cardCount === 0 && moveIndex === 0) {
        order = origCard.order + 65536;

        // either in one list or move to new list
        //case2: move to frist index of card array
      } else if (cardCount > 0 && moveIndex === 0) {
        movetoOrder = targetCardOrders[moveIndex].order;
        order = movetoOrder / 2;

        //move to new list,we need consider a  boundary,
        //move to middle of position,the other cards
        //will subsequent move to next order, so we don't need to
        //check if last order is undefined
        //case3: move to inPosition of card array
      } else if (!isSameList && cardCount > 0 &&
          typeof targetCardOrders[moveIndex - 1] !== 'undefined' &&
          typeof targetCardOrders[moveIndex] !== 'undefined') {
        beforeOrder = targetCardOrders[moveIndex - 1].order;
        movetoOrder = targetCardOrders[moveIndex].order;
        order = (beforeOrder + movetoOrder) / 2;

          // either in one list or move to new list
          //case4: move to new list, last index of card array
      } else if (isSameList && cardCount > 0 && moveIndex === lastIndex) {
        movetoOrder = targetCardOrders[moveIndex].order;
        order = movetoOrder + 65536;

      // case 5-1: in one list, move from top to bottom
      } else if (isSameList && cardCount > 0 &&
          typeof targetCardOrders[moveIndex - 1] !== 'undefined' &&
          typeof targetCardOrders[moveIndex] !== 'undefined' &&
          typeof targetCardOrders[moveIndex + 1] !== 'undefined' &&
          origCard.order < targetCardOrders[moveIndex].order) {
        movetoOrder = targetCardOrders[moveIndex].order;
        afterOrder = targetCardOrders[moveIndex + 1].order;
        order = (movetoOrder + afterOrder) / 2;

      // case 5-2: in one list, move bottom to top
      } else if (isSameList && cardCount > 0 &&
          typeof targetCardOrders[moveIndex - 1] !== 'undefined' &&
          typeof targetCardOrders[moveIndex] !== 'undefined' &&
          typeof targetCardOrders[moveIndex + 1] !== 'undefined' &&
          origCard.order > targetCardOrders[moveIndex].order) {
        beforeOrder = targetCardOrders[moveIndex - 1].order;
        movetoOrder = targetCardOrders[moveIndex].order;
        order = (beforeOrder + movetoOrder) / 2;
      }

      return order;
    };

    /**
     *  Private methods
     *  moveCardToBoard
     **/
    var _moveCardToBoard = function(data, callback) {
      async.waterfall([
        //workflow
        // 1. get move card object
        function(callback) {
          Card.findById(data.cardId, function(err, origCard) {
            callback(err, origCard);
          });
        },

        // 2. get all cards order of the target list
        function(origCard, callback) {
          Card.find({listId: data.listId}).sort({'order': 1}).select('order')
            .exec(function(err, targetCardOrders) {
              callback(err, origCard, targetCardOrders);
            });
        },

        // 3. get original list model from target move card model.
        function(origCard, targetCardOrders, callback) {
          List.findById(origCard.listId, function(err, origList) {
            callback(err, origCard, targetCardOrders, origList);
          });
        },

        // 4. update the card's order
        function(origCard, targetCardOrders, origList, callback) {
          var order = _updateMoveCardOrder(data, origCard, targetCardOrders, origList);
          callback(null, origCard, origList, order);
        },

        // 5. update card's listId, baordId and order
        function(origCard, origList, order, callback) {
          var condition = {
            'listId': data.listId,
            'boardId': data.boardId,
            'order': order
          };
          Card.findByIdAndUpdate(origCard._id, condition)
            .populate('assignees')
            .exec(function(err, updateCard) {
              callback(err, origCard, updateCard);
            });
        },

        //As a board memeber I can move a card to a list in another board
        //without its assignee.
        function(origCard, updateCard, callback) {
          var origBoardId = origCard.boardId;
          var updateBoardId = updateCard.boardId;
          var isSameBoard = (origBoardId.toString('utf-8') === updateBoardId.toString('utf-8'));

          //if the board is another board, remove assignees
          if (!isSameBoard) {
            Card.findByIdAndUpdate(origCard._id, {'assignees': []}, function(err, updateCard) {
              origCard.getCover(function(err, cover) {
                updateCard.cover = cover;
                callback(err, origCard, updateCard);
              });
            });

            var conditions = {
              'cardId': origCard.id,
              'sourceType': 'bugzilla'
            };
            CardSourceRelation.remove(conditions, function(err) {});
          } else {
            callback(null, origCard, updateCard);
          }
        }
      ], function(err, origCard, updateCard) {
        callback(err, origCard, updateCard);
      });
    };

    var _generateCardContentInBoard = function(socket, origCard, updateCard, callback) {
      var username = socket.handshake.user.username;
      async.waterfall([
        function(callback) {
          List.findOne({_id: origCard.listId}, 'title', function(err, origList) {
            if (err) {
              return callback(err, null);
            }
            callback(null, origList);
          });
        },
        function(origList, callback) {
          List.findOne({_id: updateCard.listId}, 'title', function(err, updateList) {
            if (err) {
              callback(err, null, null);
            } else {
              callback(null, origList, updateList);
            }
          });
        },
        function(origList, updateList, callback) {
          var content = util.format('%s moved card "%s" from list "%s" to list "%s"',
                        username, updateCard.title, origList.title, updateList.title);
          callback(null, content);
        }
      ], function(err, content) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, content);
        }
      });
    };

    var _generateCardContentInBoards = function(socket, origCard, updateCard, callback) {
      var username = socket.handshake.user.username;
      async.waterfall([
        function(callback) {
          Board.findOne({_id: origCard.boardId}, 'title', function(err, origBoard) {
            callback(err, origBoard);
          });
        },
        function(origBoard, callback) {
          List.findOne({_id: origCard.listId}, 'title', function(err, origList) {
            callback(err, origBoard, origList);
          });
        },
        function(origBoard, origList, callback) {
          Board.findOne({_id: updateCard.boardId}, 'title', function(err, updateBoard) {
            callback(err, origBoard, origList, updateBoard);
          });
        },
        function(origBoard, origList, updateBoard, callback) {
          List.findOne({_id: updateCard.listId}, 'title', function(err, updateList) {
            callback(err, origBoard, origList, updateBoard, updateList);
          });
        },
        function(origBoard, origList, updateBoard, updateList, callback) {
          var contentOnOrigBoard = util.format('%s moved card "%s" from list "%s" ' +
            'to board "%s" list "%s"', username, updateCard.title, origList.title,
            updateBoard.title, updateList.title);
          var contentOnUpdateBoard = util.format('%s moved card "%s" to list "%s" ' +
            'from board "%s" list "%s"', username, updateCard.title, updateList.title,
            origBoard.title, origList.title);
          callback(null, contentOnOrigBoard, contentOnUpdateBoard);
        }
      ], function(err, contentOnOrigBoard, contentOnUpdateBoard) {
        callback(err, contentOnOrigBoard, contentOnUpdateBoard);
      });
    };

    var _logActivity = function(socket, data) {
      var activity = new LogActivity({socket: socket, exceptMe: false});
      activity.log(data);
    };

    var _logActivityWhenMoveCard = function(socket, origCard, updateCard) {
      var isSameBoard = (origCard.boardId.toString('utf-8')
        === updateCard.boardId.toString('utf-8'));
      var isSameList = (origCard.listId.toString('utf-8') === updateCard.listId.toString('utf-8'));
      if (isSameBoard === true && isSameList === false) {
        _generateCardContentInBoard(socket, origCard, updateCard, function(err, content) {
          if (err) {
            console.log(err);
          } else {
            if (content) {
              _logActivity(socket, {content: content});
            }
          }
        });
      }
      if (isSameBoard === false) {
        _generateCardContentInBoards(socket, origCard, updateCard,
          function(err, contentOnOrigBoard, contentOnUpdateBoard) {
            if (err) {
              console.log(err);
            } else {
              _logActivity(socket, {content: contentOnOrigBoard});
              _logActivity(socket, {
                content: contentOnUpdateBoard,
                boardId: updateCard.boardId
              });
            }
          });
      }
    };

    /**
     * Move Card to another board
     * Arguments:
     * - data: an object containing following attributes.
     *   - boardId: holds the target list's boardId.
     *   - listId: holds the target list's Id.
     *   - position: holds the list's update position.
     * - origCard: move card's original object
     * - updateCard: move card's update object
     */
    socket.on("move-card", function(data) {
      _moveCardToBoard(data, function(err, origCard, updateCard) {
        if (err) {
          throw new Error('move-card err:' + err);
        }

        var origBoardId = origCard.boardId;
        var updateBoardId = updateCard.boardId;
        var isSameBoard = (origBoardId.toString('utf-8') === updateBoardId.toString('utf-8'));

        var eventRoomName = "board:" + updateBoardId;
        var updateEventName = "/card/" + updateCard._id + ":update";
        var removeEventName = "/card/" + updateCard._id + ":delete";
        var createEventName = "/card:move";
        var eventName = (isSameBoard === true) ? updateEventName : createEventName;
        updateCard.getBadges(function(err, badges) {
          var badgesCard = updateCard.toJSON();
          badgesCard.badges = badges;
          badgesCard.cover = updateCard.cover;

          if (isSameBoard === true) {
            socket.room.emit(eventName, badgesCard);
          } else {
            socket.broadcast.to(eventRoomName).emit(eventName, badgesCard);
            socket.room.emit(removeEventName, badgesCard);
          }
        });

        _logActivityWhenMoveCard(socket, origCard, updateCard);

      });
    });

    var _updateMoveListOrder = function(data, origList, targetListOrders) {
      var order = 65536 - 1;
      var moveIndex = data.position >= 0 ? (data.position - 1) : 0;
      var lastIndex = targetListOrders.length === 0 ? 0 : (targetListOrders.length - 1);
      var origBoardId = origList.boardId;
      var updateBoardId = data.boardId;
      var isSameBoard = (origBoardId.toString('utf-8') === updateBoardId.toString('utf-8'));
      var inListOrder = (lastIndex === 0) ? order  : targetListOrders[moveIndex].order;

      // case 1: the board have no list
      if (targetListOrders.length === 0 && moveIndex === 0) {
        return origList.order + order;
      }

      // case 2: the baord have list, move to head, index 0
      if (targetListOrders.length > 0 && moveIndex === 0) {
        order = targetListOrders[moveIndex].order / 2;
      }

      //case 4, same board, move in middle of position in one board.
      if (isSameBoard === true &&
                 moveIndex > 0 &&
                 moveIndex < lastIndex) {

        if (origList.order < inListOrder) {
          order = (inListOrder + targetListOrders[moveIndex + 1].order) / 2;
        } else if (origList.order > inListOrder) {
          order = (targetListOrders[moveIndex - 1].order + inListOrder) / 2;
        }
      }
      //case 6, same baord, move to last position
      if (isSameBoard === true && moveIndex === lastIndex) {
        order = targetListOrders[lastIndex].order + 65536;
      }

      // case 3, move to another board, the target board have more than 0 list.
      //case 5, different board, move in imddle of position in two board.
      if (isSameBoard === false &&
                moveIndex > 0 &&
                moveIndex <= lastIndex) {
        order = (targetListOrders[moveIndex - 1].order + inListOrder) / 2;
      }

      return order;
    };

    var _moveListToBoard = function(data, callback) {
      async.waterfall([
        // - get original list object
        function(callback) {
          List.findById(data.listId, function(err, origList) {
            callback(err, origList);
          });
        },

        // - get all lists from target board
        function(origList, callback) {
          List.find({boardId: data.boardId}).sort('order').select('order')
            .exec(function(err, targetListOrders) {
              callback(err, origList, targetListOrders);
            });
        },

        // - calc the list's order
        function(origList, targetListOrders, callback) {
          var order = _updateMoveListOrder(data, origList, targetListOrders);
          callback(null, order, origList);
        },

        // - boardcast the update list to target board
        function(order, origList, callback) {
          List.findByIdAndUpdate(origList._id, {'boardId': data.boardId, 'order': order},
            function(err, updateList) {
              callback(err, origList, updateList);
            });
        },
        //- update relative card's relation with the update list
        //- remove the assignees of all contained cards if move to another board
        function(origList, updateList, callback) {
          var origBoardId = origList.boardId;
          var updateBoardId = updateList.boardId;
          var isSameBoard = (origBoardId.toString('utf-8') === updateBoardId.toString('utf-8'));
          var value = {};
          if (isSameBoard) {
            value = {$set: {'boardId': data.boardId}};
          } else {
            value = {$set: {'boardId': data.boardId, 'assignees': []}};
          }
          Card.update({'listId': updateList.id}, value, { multi: true }, function(err) {
            callback(err, isSameBoard, origList, updateList);
          });
        },
        // delete all the bug cards of the moved list, which is used to sync bugzilla's bug,
        //in the CardSourceRelation table
        function(isSameBoard, origList, updateList, callback) {
          var isListWithMapping = false;
          if (!isSameBoard) {
            SyncConfig.count({'listId': updateList.id}, function(err, configCount) {
              if (err) {
                callback('can not read syncConfig table', origList, updateList);
              } else {
                if (configCount > 0) {
                  isListWithMapping = true;
                  Card.find({'listId': updateList.id}, '_id', function(err, cards) {
                    if (cards.length > 0) {
                      CardSourceRelation.remove(
                        {'cardId': {"$in": cards}, 'sourceType': 'bugzilla'},
                        function(err, removedCount) {
                          callback(err, isSameBoard, isListWithMapping, origList, updateList);
                        }
                      );
                    } else {
                      callback(err, isSameBoard, isListWithMapping, origList, updateList);
                    }
                  });
                } else {
                  callback(err, isSameBoard, isListWithMapping, origList, updateList);
                }
              }
            });
          } else {
            callback(null, isSameBoard, isListWithMapping, origList, updateList);
          }
        },
        // update the record with the same name according to the moved list's name in
        // SyncConfig table or create a new list with the name
        function(isSameBoard, isListWithMapping, origList, updateList, callback) {
          if (!isSameBoard) {
            if (isListWithMapping) {
              List.findOne({'boardId': origList.boardId, 'title': origList.title}, '_id',
                function(err, list) {
                  if (err) {
                    callback(err, origList, updateList);
                  } else {
                    if (list) {
                      SyncConfig.update({'listId': origList._id}, {'listId': list.id},
                        {multi: true}, function(err) {
                          callback(err, origList, updateList);
                        });
                    } else {
                      var listModel = new List({'title': origList.title,
                        'creatorId': origList.creatorId,
                        'boardId': origList.boardId,
                        'order': origList.order});
                      listModel.save(function(err, savedList) {
                        if (err) {
                          callback(err, origList, updateList);
                        } else {
                          data.socket.room.emit('/list:create', savedList, {exceptMe: false});
                          SyncConfig.update({'listId': origList._id}, {'listId': savedList.id},
                            {multi: true}, function(err) {
                              callback(err, origList, updateList);
                            });
                        }
                      });
                    }
                  }
                });
            } else {
              callback(null, origList, updateList);
            }
          } else {
            callback(null, origList, updateList);
          }
        }
      ], function(err, origList, updateList) {
        callback(err, origList, updateList);
      });
    };

    var _generateListActivityContent = function(socket, origList, updateList, callback) {
      var username = socket.handshake.user.username;
      async.waterfall([
        function (callback) {
          Board.findOne({_id: origList.boardId}, 'title', function(err, origBoard) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, origBoard);
            }
          });
        },
        function (origBoard, callback) {
          Board.findOne({_id: updateList.boardId}, 'title', function(err, updateBoard) {
            if (err) {
              callback(err, null, null);
            } else {
              callback(null, origBoard, updateBoard);
            }
          });
        },
        function (origBoard, updateBoard, callback) {
          var contentOnOrigBoard = util.format('%s moved list "%s" from this board to board "%s"',
                            username, updateList.title, updateBoard.title);

          var contentOnUpdateBoard = util.format('%s moved list "%s" from board "%s" to this board',
                               username, updateList.title, origBoard.title);
          callback(null, contentOnOrigBoard, contentOnUpdateBoard);
        }
      ], function(err, contentOnOrigBoard, contentOnUpdateBoard) {
        if (err) {
          callback(err, null, null);
        } else {
          callback(null, contentOnOrigBoard, contentOnUpdateBoard);
        }
      });
    };

    var _logActivityWhenMoveList = function(socket, origList, updateList) {
      _generateListActivityContent(socket, origList, updateList,
        function(err, contentOnOrigBoard, contentOnUpdateBoard) {
          _logActivity(socket, {content: contentOnOrigBoard});
          _logActivity(socket, {
            content: contentOnUpdateBoard,
            boardId: updateList.boardId
          });
        });
    };

    /*
     * Move List to another board
     *
     * Arguments:
     * - data: an object containing following attributes.
     *   - boardId: holds the target list's boardId.
     *   - listId: holds the target list's Id.
     *   - position: holds the list's update position.
     */
    socket.on("move-list", function(data) {
      data.socket = this;
      _moveListToBoard(data, function(err, origList, updateList) {
        if (err) {
          throw new Error('move-list err:' + err);
        }

        var origBoardId = origList.boardId;
        var updateBoardId = updateList.boardId;
        var isSameBoard = (origBoardId.toString('utf-8') === updateBoardId.toString('utf-8'));

        var eventRoomName = "board:" + updateBoardId;
        var updateEventName = "/list/" + updateList._id + ":update";
        var removeEventName = "/list/" + updateList._id + ":delete";
        var createEventName = "/list:move";
        var eventName = (isSameBoard === true) ? updateEventName : createEventName;
        if (isSameBoard === true) {
          socket.room.emit(eventName, updateList);
        } else {
          _logActivityWhenMoveList(socket, origList, updateList);
          socket.broadcast.to(eventRoomName).emit(eventName, updateList);
          socket.room.emit(removeEventName, updateList);
        }

      });
    });
  };


}(exports));
