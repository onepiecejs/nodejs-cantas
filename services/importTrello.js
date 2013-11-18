
(function (exports) {

  var mongoose = require('mongoose');
  var Board = require('./../models/board');
  var List = require('./../models/list');
  var Card = require('./../models/card');
  var Checklist = require('./../models/checklist');
  var ChecklistItem = require('./../models/checklistItem');
  var Comment = require('./../models/comment');
  var Label = require('./../models/label');
  var CardLabelRelation = require('./../models/cardLabelRelation');
  var User = require('./../models/user');
  var BoardMemberRelation = require('./../models/boardMemberRelation');
  var BoardMemberStatus = require('./../models/boardMemberStatus');
  var async = require('async');
  var Schema = mongoose.Schema;
  var ObjectId =  Schema.ObjectId;
  var signals = require('../sockets/signals');

  exports.addupSuccessCount = function(dataSource) {
    var count = 1 + dataSource.lists.length +
                dataSource.cards.length +
                dataSource.checklists.length;
    var i;
    for (i = 0; i < dataSource.actions.length; i++) {
      if (dataSource.actions[i].type === 'commentCard') {
        count += 1;
      }
    }

    for (i = 0; i < dataSource.checklists.length; i++) {
      count += dataSource.checklists[i].checkItems.length;
    }

    for (i = 0; i < dataSource.cards.length; i++) {
      count += dataSource.cards[i].labels.length;
    }

    return count;
  };

  function createComment(userId, cardId, originalCardId, updatedBoard, dataSource, callback) {
    var length = dataSource.actions.length;
    var comments = [];
    var i;
    for (i = 0; i < length; i++) {
      if (dataSource.actions[i].type === 'commentCard' &&
          dataSource.actions[i].data.card.id === originalCardId) {
        comments.push(dataSource.actions[i]);
      }
    }
    var count = comments.length;
    if (count > 0) {
      var comment = {};

      async.whilst(
        function () { return count > 0; },
        function (cb) {
          count--;
          comment = comments[count];

          var newComment = new Comment({
            'content': '[' + comment.memberCreator.username + ']' + comment.data.text,
            'cardId': cardId,
            'authorId': userId,
            'createdOn': new Date(comment.date)
          });
          newComment.save(function(err, createdComment) {
            if (err) {
              callback('Creating the comment presented by ' +
                        comment.memberCreator.username + ' failed');
            } else {
              callback(null);
              cb(null);
            }
          });
        },
        function (err) {
          if (err) {
            callback('Creating the comment presented by ' +
                      comment.memberCreator.username + ' failed');
          }
        }
      );
    }
  }

  function createCardLabelRelation(labels, cardId, updatedBoard, dataSource, callback) {
    var order = 0;

    async.whilst(
      function () { return order < 8; },
      function (cb1) {
        order++;

        async.waterfall([
          function(cb2) {
            Label.findOne({'boardId': updatedBoard.id, 'order': order },
              function(err, queriedLabel) {
                if (err) {
                  callback('Creating the labels for card(id: ' + cardId + ') failed');
                } else {
                  var color = '';
                  switch (queriedLabel.color) {
                  case '#F0F064':
                    color = 'yellow';
                    break;
                  case '#EB9588':
                    color = 'red';
                    break;
                  case '#CEB3E6':
                    color = 'purple';
                    break;
                  case '#F5BE55':
                    color = 'orange';
                    break;
                  case '#A2D98C':
                    color = 'green';
                    break;
                  case '#7DC2FF':
                    color = 'blue';
                    break;
                  }
                  var length = labels.length;
                  var selected = false;
                  if (length > 0) {
                    var i;
                    for (i = 0; i < length; i++) {
                      if (labels[i].color === color) {
                        selected = true;
                      }
                    }
                  }
                  cb2(null, queriedLabel.id, selected);
                }
              });
          },
          function (labelId, selected, cb2) {
            var newCardLabelRelation = new CardLabelRelation({
              'boardId': updatedBoard.id,
              'cardId': cardId,
              'labelId': labelId,
              'selected': selected
            });
            newCardLabelRelation.save(function(err, createdCardLabelRelation) {
              if (err) {
                callback('Creating the labels for card(id: ' + cardId + ') failed');
              } else {
                cb2(null);
              }
            });
          }
        ], function (err) {
          if (err) {
            callback('Creating the labels for card(id: ' + cardId + ') failed');
          } else {
            callback(null);
            cb1(null);
          }
        });
      },
      function (err) {
        if (err) {
          callback('Creating the labels for card(id: ' + cardId + ') failed');
        }
      }
    );
  }

  function createChecklistItem(userId, checklistItems, checklistId,
                                cardId, updatedBoard, callback) {
    var count = checklistItems.length;
    if (count > 0) {
      var checklistItem = {};

      async.whilst(
        function () { return count > 0; },
        function (cb) {
          count--;
          checklistItem = checklistItems[count];
          var newChecklistItem = new ChecklistItem({
            'checked': (checklistItem.state === 'complete') ? true : false,
            'content': checklistItem.name,
            'order': checklistItem.pos,
            'checklistId': checklistId,
            'cardId': cardId,
            'authorId': userId
          });
          newChecklistItem.save(function(err, createdChecklistItem) {
            if (err) {
              callback('Creating the checklist item failed');
            } else {
              callback(null);
              cb(null);
            }
          });
        },
        function (err) {
          if (err) {
            callback('Creating the checklist item failed');
          }
        }
      );
    }
  }

  function createChecklist(userId, cardId, originalCardId, updatedBoard, dataSource, callback) {
    var length = dataSource.checklists.length;
    var checklists = [];
    var i;
    for (i = 0; i < length; i++) {
      if (dataSource.checklists[i].idCard === originalCardId) {
        checklists.push(dataSource.checklists[i]);
      }
    }
    var count = checklists.length;
    if (count > 0) {
      var checklist = {};

      async.whilst(
        function () { return count > 0; },
        function (cb) {
          count--;
          checklist = checklists[count];
          var newChecklist = new Checklist({
            'title': checklist.name,
            'cardId': cardId,
            'authorId': userId
          });
          newChecklist.save(function(err, createdChecklist) {
            if (err) {
              callback('Creating the checklist ' + checklist.name + 'failed');
            } else {
              callback(null);
              if (checklist.checkItems.length > 0) {
                createChecklistItem(userId, checklist.checkItems, createdChecklist.id,
                                    cardId, updatedBoard, callback);
              }
              cb(null);
            }
          });
        },
        function (err) {
          if (err) {
            callback('Creating the checklist ' + checklist.name + 'failed');
          }
        }
      );
    }
  }

  function createCard(userId, listId, originalListId, updatedBoard, dataSource, callback) {
    var length = dataSource.cards.length;
    var cards = [];
    var i;
    for (i = 0; i < length; i++) {
      if (dataSource.cards[i].idList === originalListId) {
        cards.push(dataSource.cards[i]);
      }
    }
    var count = cards.length;
    if (count > 0) {
      var card = {};

      async.whilst(
        function () { return count > 0; },
        function (cb) {
          count--;
          card = cards[count];

          var newCard = new Card({
            'title': card.name,
            'isArchived': card.closed,
            'description': card.desc,
            'boardId': updatedBoard.id,
            'listId': listId,
            'order': card.pos,
            'creatorId': userId
          });
          newCard.save(function(err, createdCard) {
            if (err) {
              callback('Creating the card ' + card.name + 'failed');
            } else {
              callback(null);
              if (dataSource.checklists.length > 0) {
                createChecklist(userId, createdCard.id, card.id,
                                updatedBoard, dataSource, callback);
              }
              if (dataSource.actions.length > 0) {
                createComment(userId, createdCard.id, card.id,
                              updatedBoard, dataSource, callback);
              }

              createCardLabelRelation(card.labels, createdCard.id,
                                      updatedBoard, dataSource, callback);

              cb(null);
            }
          });
        },
        function (err) {
          if (err) {
            callback('Creating the card ' + card.name + 'failed');
          }
        }
      );
    }
  }

  function createList(userId, updatedBoard, dataSource, callback) {
    var count = dataSource.lists.length;
    var list = {};

    async.whilst(
      function () { return count > 0; },
      function (cb) {
        count--;
        list = dataSource.lists[count];
        var newList = new List({
          'title': list.name,
          'isArchived': list.closed,
          'creatorId': userId,
          'order': list.pos,
          'boardId': updatedBoard.id
        });
        newList.save(function(err, createdList) {
          if (err) {
            callback('Creating the list ' + list.name + 'failed');
          } else {
            // the next line is used to report that creat new list action is completed successfully
            callback(null);
            if (dataSource.cards.length > 0) {
              createCard(userId, createdList.id, list.id, updatedBoard, dataSource, callback);
            }
            // the next line is used to tell the async.whilst to continue next loop
            cb(null);
          }
        });
      },
      function (err) {
        if (err) {
          callback('Creating the list ' + list.name + 'failed');
        }
      }
    );
  }

  exports.appendContentToBoard = function(userId, boardId, dataSource, callback) {
    var voteStatus = '';
    if (dataSource.prefs.voting === 'disabled') {
      voteStatus = 'disabled';
    } else if (dataSource.prefs.voting === 'members') {
      voteStatus = 'enabled';
    } else {
      voteStatus = 'opened';
    }
    var commentStatus = '';
    if (dataSource.prefs.comments === 'disabled') {
      commentStatus = 'disabled';
    } else if (dataSource.prefs.comments === 'members') {
      commentStatus = 'enabled';
    } else {
      commentStatus = 'opened';
    }
    Board.findByIdAndUpdate(boardId, {
      'title': dataSource.name,
      'description': dataSource.desc,
      'isPublic': (dataSource.prefs.permissionLevel === 'public') ? true : false,
      'voteStatus': voteStatus,
      'commentStatus': commentStatus
    },
      function(err, updatedBoard) {
        if (err) {
          callback('Updating the properties of the board failed');
        } else {
          callback(null);
          if (dataSource.lists.length > 0) {
            createList(userId, updatedBoard, dataSource, callback);
          }
        }
      });

  };

}(exports));
