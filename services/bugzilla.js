(function(module) {

  "use strict";

  var bz = require("./integration/bz-API.js");
  var settings = require("../settings");
  var url = require("url");
  var util = require("util");
  var async = require("async");
  var signals = require("../sockets/signals");
  var Card = require("../models/card");
  var Comment = require("../models/comment");
  var CardBugRelation = require("../models/cardSourceRelation");
  var CommentBugRelation = require("../models/commentSourceRelation");
  var syncStatusArray = [];

  var bugzilla = bz.createClient({
    url: settings.bugzilla.url,
    username: settings.bugzilla.username,
    password: settings.bugzilla.password
  });

  var SyncBugzilla = function(options) {
    var _options = options || null;
    this.syncConfigId = _options.syncConfigId;
    this.boardId = _options.boardId;
    this.listId = _options.listId;
    this.queryUrl = _options.queryUrl;
    this.socket = _options.socket;
    this.currentUser = _options.socket.handshake.user;
  };

  var searchBug = function(options, callback) {
    var queryUrl = options.queryUrl || null;
    if (queryUrl) {
      var parseUrl = url.parse(queryUrl, true);
      var criteria = parseUrl.query;
      bugzilla.query(bz.queryMethod.BUG_SEARCH, criteria, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, data.bugs);
        }
      });
    }
  };

  SyncBugzilla.prototype = {
    _canSyncNow: function() {
      var length = syncStatusArray.length;
      var i = 0;
      for (i; i < length; i++) {
        if (syncStatusArray[i] === this.syncConfigId.toString()) {
          return false;
        }
      }
      return true;
    },

    _syncBug: function(options, callback) {
      var self = this;
      var bug = options.bug || null;
      var comments = options.comments || null;

      async.waterfall([
        function(callback) {
          self.taskCreateCard(options, function(err, options) {
            callback(err, options);
          });
        },
        function(options, callback) {
          self.taskSyncComments(options, callback);
        },
        function(options, callback) {
          self.taskCreateCardBugRelation(options, callback);
        }
      ], function(err, cardBugRelation) {
        callback(err, cardBugRelation);
      });
    },

    _updateBug: function(options, callback) {
      var self = this;
      var bug = options.bug || null;
      var comments = options.comments || null;
      var cardBugRelation = options.cardBugRelation || null;
      async.waterfall([
        function(callback) {
          Card.findById(cardBugRelation.cardId, function(err, card) {
            callback(err, card);
          });
        },
        function(card, callback) {
          options.card = card;
          self.taskUpdateCard(options, callback);
        },
        function(options, callback) {
          self.taskSyncComments(options, callback);
        },
        function(options, callback) {
          self.taskUpdateCardBugRelation(options, callback);
        }
      ], function(err, cardBugRelation) {
        callback(err, cardBugRelation);
      });
    },

    taskCreateCard: function(options, callback) {
      var self = this;
      var bug = options.bug || null;
      var comments = options.comments || null;
      var bugDescription = '';
      if (comments) {
        bugDescription = comments[0].text;
        comments = comments.slice(1, comments.length);
      }
      var data = {
        title: util.format('Bug %s - %s - %s', bug.id, bug.status, bug.summary),
        description: util.format('<%s%s>\n\n\ncreator:%s\n\n\n%s',
          settings.bugzilla.bugBaseUrl,
          bug.id,
          bug.creator,
          bugDescription),
        listId: self.listId,
        boardId: self.boardId,
        creatorId: self.currentUser.id
      };
      var card = new Card(data);
      card.save(function(err, createdCard) {
        if (err) {
          callback(err, null);
        } else {
          var eventName = '/card:create';
          self.socket.room.emit(eventName, createdCard, {exceptMe: false});
          signals.post_create.send(createdCard,
            {
              instance: createdCard,
              socket: self.socket
            },
            function(err, result) {});

          var options = {
            'bug': bug,
            'card': createdCard,
            'comments': comments
          };
          callback(null, options);
        }
      });
    },

    taskUpdateCard: function(options, callback) {
      var self = this;
      var card = options.card;
      var bug = options.bug;
      var comments = options.comments;
      var cardBugRelation = options.cardBugRelation || null;
      var bugDescription = '';
      if (comments) {
        bugDescription = comments[0].text;
        comments = comments.slice(1, comments.length);
      }
      var data = {
        title: util.format('Bug %s - %s - %s', bug.id, bug.status, bug.summary),
        description: util.format('<%s%s>\n\n\ncreator:%s\n\n\n%s',
          settings.bugzilla.bugBaseUrl,
          bug.id,
          bug.creator,
          bugDescription),
        creatorId: self.currentUser.id
      };
      Card.findByIdAndUpdate(card.id, {$set: data}, function(err, updatedCard) {
        if (err) {
          callback(err, null);
        } else {
          var eventName = '/card/' + updatedCard._id + ':update';
          updatedCard.populate("assignees", function(err, updatedData) {
            self.socket.room.emit(eventName, updatedCard, {exceptMe: false});
          });
          var options = {
            'bug': bug,
            'card': updatedCard,
            'comments': comments,
            'cardBugRelation': cardBugRelation
          };
          callback(null, options);
        }
      });
    },

    taskSyncComments: function(options, callback) {
      var self = this;
      var card = options.card || null;
      var comments = options.comments || null;
      var bug = options.bug || null;
      var cardBugRelation = options.cardBugRelation || null;
      if (comments) {
        async.map(comments, function(comment, callback) {
          var options = {
            'comment': comment,
            'card': card
          };
          self._searchCommentBugRelation(options, function(err, commentBugRelation) {
            if (err) {
              callback(err, null);
            } else if (commentBugRelation) {
              callback(null, commentBugRelation);
            } else {
              var options = {
                'card': card,
                'bug': bug,
                'comment': comment
              };
              self._createComment(options, callback);
            }
          });
        }, function(err, result) {
          if (err) {
            callback(err, null);
          } else {
            var options = {
              'card': card,
              'bug': bug,
              'cardBugRelation': cardBugRelation
            };
            callback(null, options);
          }
        });
      }
    },

    taskCreateCardBugRelation: function(options, callback) {
      var self = this;
      var card = options.card || null;
      var bug = options.bug || null;
      var data = {
        syncConfigId: self.syncConfigId,
        cardId: card._id,
        sourceId: bug.id,
        sourceType: 'bugzilla'
      };
      var cardBugRelation = new CardBugRelation(data);
      cardBugRelation.save(function(err, createdCardBugRelation) {
        callback(err, createdCardBugRelation);
      });
    },

    taskUpdateCardBugRelation: function(options, callback) {
      var self = this;
      var cardBugRelation = options.cardBugRelation || null;
      var data = { 'lastSyncTime': Date.now() };
      CardBugRelation.findByIdAndUpdate(
        cardBugRelation._id,
        {$set: data},
        function(err, updatedCardBugRelation) {
          callback(err, updatedCardBugRelation);
        }
      );
    },

    _createComment: function(options, callback) {
      var self = this;
      var card = options.card;
      var bug = options.bug;
      var comment = options.comment;
      async.waterfall([
        function(callback) {
          var commentUrl = settings.bugzilla.bugBaseUrl + bug.id + '#c' + comment.count;
          var data = {
            content: util.format('[%s] - %s\n\n\n<%s>', comment.author, comment.text, commentUrl),
            cardId: card.id,
            authorId: self.currentUser.id,
            createdOn: comment.creation_time,
            updatedOn: comment.time
          };
          var cardComment = new Comment(data);
          cardComment.save(function(err, createdComment) {
            if (err) {
              callback(err, null);
            } else {
              var eventName = '/comment:create';
              self.socket.emit(eventName, createdComment, {exceptMe: false});
              signals.post_create.send(createdComment,
                {
                  instance: createdComment,
                  socket: self.socket
                },
                function(err, result) {});
              callback(null, createdComment);
            }
          });
        },
        function(cardComment, callback) {
          var data = {
            commentId: cardComment._id,
            cardId: card._id,
            sourceId: comment.id,
            sourceType: 'bugzilla'
          };
          var commentBugRelation = new CommentBugRelation(data);
          commentBugRelation.save(function(err, createdCommentBugRelation) {
            callback(null, createdCommentBugRelation);
          });
        }
      ], function(err, commentBugRelation) {
        callback(err, commentBugRelation);
      });
    },

    _searchCardBug: function(bug, callback) {
      var self = this;
      if (bug) {
        var criteria = {
          syncConfigId: self.syncConfigId,
          sourceId: bug.id,
          sourceType: 'bugzilla'
        };
        CardBugRelation.findOne(criteria, '_id cardId', function(err, cardBugRelation) {
          callback(err, cardBugRelation);
        });
      }
    },

    _searchCommentBugRelation: function(options, callback) {
      var comment = options.comment;
      var card = options.card;
      if (comment) {
        var criteria = {
          sourceId: comment.id,
          cardId: card.id,
          sourceType: 'bugzilla'
        };
        CommentBugRelation.findOne(criteria, '_id commentId', function(err, commentBugRelation) {
          callback(err, commentBugRelation);
        });
      }
    }

  };

  SyncBugzilla.prototype.getBugList = function(callback) {
    var self = this;
    async.waterfall([
      function(callback) {
        var options = {queryUrl: self.queryUrl};
        searchBug(options, callback);
      },
      function(bugs, callback) {
        var bugIds = [];
        bugs.forEach(function(bug) {
          bugIds.push(bug.id);
        });
        var criteria = {'ids': bugIds};
        bugzilla.query(bz.queryMethod.BUG_COMMENT, criteria, function(err, comments) {
          if (err) {
            callback(err, null, null);
          } else {
            var options = {
              'comments': comments.bugs,
              'bugs': bugs
            };
            callback(null, options);
          }
        });
      }
    ], function(err, options) {
      callback(err, options);
    });
  };

  SyncBugzilla.prototype.startSync = function(options, callback) {
    var self = this;
    var bugs = options.bugs;
    var allComments = options.comments;
    async.mapSeries(bugs, function(bug, callback) {
      var comments = [];
      if (allComments) {
        comments = allComments[bug.id].comments;
      }
      self._searchCardBug(bug, function(err, cardBugRelation) {
        if (err) {
          callback(err, null);
        } else if (self._canSyncNow()) {
          var options = {};
          if (cardBugRelation) {
            options = {
              'bug': bug,
              'comments': comments,
              'cardBugRelation': cardBugRelation
            };
            self._updateBug(options, callback);
          } else {
            options = {
              'bug': bug,
              'comments': comments
            };
            self._syncBug(options, callback);
          }
        } else {
          callback('SyncStoped', null);
        }
      });
    }, function(err, result) {
      callback(err, result);
    });
  };


  module.exports.SyncBugzilla = SyncBugzilla;
  module.exports.SearchBug = searchBug;
  module.exports.syncStatusArray = syncStatusArray;

}(module));
