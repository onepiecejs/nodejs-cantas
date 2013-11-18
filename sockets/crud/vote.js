(function(module) {

  'use strict';

  var async = require('async');
  var util = require('util');
  var signals = require('../signals');
  var Board = require('../../models/board');
  var voteStatus = require('../../models/configStatus');
  var BaseCRUD = require('./base');

  function VoteCRUD(options) {
    BaseCRUD.call(this, options);

    this.deleteEnabled = true;
    this.modelClass = require('../../models/vote');
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(VoteCRUD, BaseCRUD);

  /*
  * Check the board voteStatus before all the operation of Vote in database.
  * A user can vote in a card must satisfy one of the conditions:
  * 1.The board voteStatus is enabled and the user is board member.
  * 2.The board voteStatus is opened (everyone can vote).
  */
  VoteCRUD.prototype._canVote = function(callback) {
    var self = this;

    async.waterfall([
      function(callback) {
        var user = self.socket.handshake.user;
        var boardId = self.socket.room.board.split(':')[1];
        Board.findById(boardId, function(err, board) {
          if (err) {
            callback(err, null, null);
          } else {
            callback(null, user, board);
          }
        });
      },
      function(user, board, callback) {
        var canVote = false;
        if (board.voteStatus === voteStatus.opened) {
          canVote = true;
        }
        if (board.voteStatus === voteStatus.enabled) {
          self.isBoardMember(function(err, isMember) {
            if (err) {
              return callback(err, null);
            }
            if (isMember) {
              canVote = true;
              callback(null, canVote);
            }
          });
        }
        callback(null, canVote);
      }
    ], function(err, canVote) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, canVote);
      }
    });
  };

  VoteCRUD.prototype._create = function(data, callback) {
    var voteNew = new this.modelClass(data);
    var name = '/' + this.key + ':create';
    var self = this;

    this._canVote(function(err, canVote) {
      if (err) {
        callback(err, voteNew);
      }
      if (canVote) {
        // Check if the user already voted in the card.
        self.modelClass.find({cardId: voteNew.cardId, authorId: voteNew.authorId},
          function(err, vote) {
            if (err) {
              callback(err, null);
            }
            if (vote.length) {
              callback(true, vote);
            } else {
              voteNew.save(function(err, savedVote) {
                if (err) {
                  callback(err, voteNew);
                } else {
                  self.emitMessage(name, savedVote);

                  signals.post_create.send(savedVote, {
                    instance: savedVote,
                    socket: self.socket
                  }, function(err, result) {});
                }
              });
            }
          });
      } else {
        callback('Can not vote', voteNew);
      }
    });
  };

  VoteCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data._id;

    this._canVote(function(err, canVote) {
      if (err) {
        callback(err, data);
      }
      if (canVote) {
        data.updatedOn = Date.now();
        self.modelClass.findByIdAndUpdate(_id, data, function(err, updatedVote) {
          if (err) {
            callback(err, data);
          } else {
            self.emitMessage(name, updatedVote);

            signals.post_patch.send(updatedVote, {
              instance: updatedVote,
              socket: self.socket
            }, function(err, result) {});
          }
        });
      } else {
        callback('Can not vote', data);
      }
    });
  };


  VoteCRUD.prototype._delete = function(data, callback) {
    var self = this;

    if (data && data._id) {
      var field = data._id;
      var name = '/' + this.key + '/' + field + ':delete';

      this._canVote(function(err, canVote) {
        if (err) {
          callback(err, data);
        }
        if (canVote) {
          self.modelClass.findByIdAndRemove(data._id, function(err, removedVote) {
            if (err) {
              callback(err, data);
            } else {
              self.emitMessage(name, removedVote);

              signals.post_delete.send(removedVote, {
                instance: removedVote,
                socket: self.socket
              }, function(err, result) {});
            }
          });
        } else {
          callback('Can not vote', data);
        }
      });
    }
  };

  module.exports = VoteCRUD;

}(module));

