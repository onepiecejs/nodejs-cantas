

(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var User = require("../../models/user");
  var List = require("../../models/list");
  var Sites = require("../../services/sites");
  var notification = require("../../services/notification");
  var cantasUtils = require('../../services/utils');
  var signals = require("../signals");
  var _ = require('lodash');

  function CardCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/card");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(CardCRUD, BaseCRUD);

  CardCRUD.prototype.generateActivityContent = function(model, action, data, callback) {
    var content = null;
    var displayName = this.handshake.user.displayName;
    async.waterfall([
      function(callback) {
        var listId = null;
        if (action === 'create') {
          listId = data.createdObject.listId;
        }
        if (action === 'update') {
          listId = data.changedData.listId;
        }
        List.findOne({_id: listId}, 'title', function(err, list) {
          if (err) {
            return callback(err, null);
          }
          callback(null, list);
        });
      },
      function(list, callback) {
        if (action === 'create') {
          var createdObject = data.createdObject;
          var sourceObject = data.sourceObject;
          content = util.format('%s added %s "%s" in list "%s"', displayName, model,
            createdObject.title, list.title);
          if (sourceObject) {
            content = util.format('%s converted %s "%s" to %s "%s" in list "%s"',
                                  displayName, sourceObject.model, sourceObject.title,
                                  model, createdObject.title, list.title);
          }
          callback(null, content);
        }
        if (action === 'update') {
          content = util.format('%s changed %s of %s "%s" from "%s" to "%s"',
                                displayName, data.field,
                                model, data.changedData.title, data.originData[data.field],
                                data.changedData[data.field]);

          if (data.field === 'isArchived') {
            if (data.changedData[data.field] === true) {
              content = util.format('%s archived %s "%s" from list "%s"',
                                    displayName, model, data.changedData.title, list.title);
              callback(null, content);
            }
            if (data.changedData[data.field] === false) {
              content = util.format('%s unarchived %s "%s" to list "%s"',
                                    displayName, model, data.changedData.title, list.title);
              callback(null, content);
            }
          }

          if (data.field === 'listId') {
            List.findOne({_id: data.originData[data.field]}, 'title', function(err, fromList) {
              if (err) {
                return callback(err, null);
              }
              content = util.format('%s moved %s "%s" from list "%s" to list "%s"',
                                    displayName, model, data.changedData.title,
                                    fromList.title, list.title);
              callback(null, content);
            });
          }
        }
      }
    ], function(err, content) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, content);
      }
    });
  };

  CardCRUD.prototype._read = function(data, callback) {

    // Parse special value types in the query
    data = this._parseQuery(data);

    if (data) {
      if (data._id) {
        this.modelClass.findOne(data).populate("assignees").exec(
          function (err, result) {
            callback(err, result);
          }
        );
      } else {

        // Build a query from the request data (Allows for limit, skip, sorting, etc.)
        var query = this._buildQuery(this.modelClass, _.extend({}, data, {
          $populate: "assignees"
        }));

        query.exec(
          function (err, result) {

            // If the result is not an array or object (a count) we don't need to ger any meta data
            if (!_.isArray(result) || !_.isObject(result)) {
              return callback(null, result);
            }

            async.map(
              result,
              function(card, callback) {
                var transformed = card.toJSON();
                async.parallel([
                  // Get badges
                  function(callback) {
                    card.getBadges(function(err, badges) {
                      transformed.badges = badges;
                      callback(null, transformed.badges);
                    });
                  },
                  // Get cover
                  function(callback) {
                    card.getCover(function(err, cover) {
                      transformed.cover = cover;
                      callback(null, transformed.cover);
                    });
                  },
                  // Get board meta
                  function(callback) {
                    card.getBoardMeta(function(err, board) {
                      transformed.board = board;
                      callback(null, transformed.board);
                    });
                  },
                  // Get list meta
                  function(callback) {
                    card.getListMeta(function(err, list) {
                      transformed.list = list;
                      callback(null, transformed.list);
                    });
                  }
                ], function(err, results) {
                  callback(null, transformed);
                });
              },
              function(err, result) {
                callback(err, result);
              }
            );
          }
        );
      }
    } else {
      this.modelClass.find({}).populate("assignees").exec(callback);
    }
  };

  CardCRUD.prototype._patch = function(data, callback) {
    var self = this;
    //var _id = data._id || data.id;
    var patchInfo = self._generatePatchInfo(data);
    var _id = patchInfo.id;
    var user = this.socket.getCurrentUser();
    var name = '/' + this.key + '/' + _id + ':update';
    var originData = patchInfo.originData;
    var changeFields = patchInfo.changeFields;
    data = patchInfo.data;

    if (data.assignees) {
      async.waterfall([
        function(callback) {
          // update card assignees
          self.modelClass.findById(_id, function (err, card) {
            if (err) {
              callback(err, card);
            } else {
              var newAssignees = [];
              var originAssignees = originData.assignees || null;
              data.assignees.forEach(function(assignee) {
                if (card.assignees.indexOf(assignee) === -1) {
                  newAssignees.push(assignee);
                }
              });

              //remove assignees
              var removedAssignees = [];
              if (originAssignees) {
                originAssignees.forEach(function(assignee) {
                  if (data.assignees.indexOf(assignee) === -1) {
                    removedAssignees.push(assignee);
                  }
                });
              }

              card.assignees = data.assignees;
              card.save(function(err, updatedCard) {
                if (err) {
                  callback(err, updatedCard);
                } else {
                  callback(null, updatedCard, newAssignees, removedAssignees);
                }
              });
            }
          });
        },
        function(updatedCard, newAssignees, removedAssignees, callback) {
          // send notification and email to new assignees
          var assigner = user;
          if (newAssignees.length) {
            User.find({_id: {$in: newAssignees}}, function(err, users) {
              users.forEach(function(assignee) {
                var safeTitle = cantasUtils.safeMarkdownString(updatedCard.title);
                var msg = util.format("%s assigned card [%s](%s) to you.",
                                      assigner.displayName, safeTitle, updatedCard.url);
                if (assigner.id.toString() !== assignee.id.toString()) {
                  notification.notify(self.socket, assignee, msg, notification.types.information);
                  notification.mail(self.socket, assignee, msg, notification.types.information, {
                    body: {
                      assigner: assigner.displayName,
                      assignee: assignee.displayName,
                      cardTitle: updatedCard.title,
                      cardUrl: Sites.currentSite() + updatedCard.url
                    },
                    template: "assign.jade",
                  });
                }
                // send notification to subscribers.
                updatedCard.getSubscribeUsers(function(err, subscribeUsers) {
                  var notifyMsg = util.format("%s assigned card [%s](%s) to %s.",
                                              assigner.displayName, safeTitle, updatedCard.url,
                                              assignee.displayName);
                  subscribeUsers.forEach(function(subscriber) {
                    if (assigner.id.toString() === subscriber.id.toString()) {
                      notifyMsg = util.format("You assigned card [%s](%s) to %s.",
                                              safeTitle, updatedCard.url, assignee.displayName);
                    }
                    if (assignee.id.toString() !== subscriber.id.toString()) {
                      notification.notify(self.socket, subscriber, notifyMsg,
                                          notification.types.information);
                    }
                  });
                });
              });
            });
          }
          if (removedAssignees.length) {
            User.find({_id: {$in: removedAssignees}}, function(err, users) {
              users.forEach(function(assignee) {
                var safeTitle = cantasUtils.safeMarkdownString(updatedCard.title);
                var msg = util.format("%s cancel assignment of card [%s](%s) to you.",
                                      assigner.displayName, safeTitle, updatedCard.url);
                if (assigner.id.toString() !== assignee.id.toString()) {
                  notification.notify(self.socket, assignee, msg, notification.types.information);
                  notification.mail(self.socket, assignee, msg, notification.types.information, {
                    body: {
                      assigner: assigner.displayName,
                      assignee: assignee.displayName,
                      cardTitle: updatedCard.title,
                      cardUrl: Sites.currentSite() + updatedCard.url
                    },
                    template: "assign.jade",
                  });
                }
                // send notification to subscribers.
                updatedCard.getSubscribeUsers(function(err, subscribeUsers) {
                  var notifyMsg = util.format("%s cancelled assignment of card [%s](%s) to %s.",
                                              assigner.displayName, safeTitle, updatedCard.url,
                                              assignee.displayName);
                  subscribeUsers.forEach(function(subscriber) {
                    if (assigner.id.toString() === subscriber.id.toString()) {
                      notifyMsg = util.format("You cancelled assignment of card [%s](%s) to %s.",
                                              safeTitle, updatedCard.url, assignee.displayName);
                    }
                    if (assignee.id.toString() !== subscriber.id.toString()) {
                      notification.notify(self.socket, subscriber, notifyMsg,
                                          notification.types.information);
                    }
                  });
                });
              });
            });
          }
          callback(null, updatedCard);
        }
      ], function(err, updatedCard) {
        if (err) {
          callback(err, updatedCard);
        } else {
          updatedCard.populate("assignees", function(err, card) {
            if (err) {
              callback(err, card);
            } else {
              self.emitMessage(name, card);
            }
          });
        }
      });
    } else {
      this.modelClass.findByIdAndUpdate(_id, {$set : data}, function (err, updatedData) {
        if (err) {
          callback(err, updatedData);
        } else {
          if (changeFields.length >= 1) {
            async.map(changeFields, function(changeField, cb) {
              var changeInfo = {
                field: changeField,
                originData: originData,
                changedData: updatedData
              };

              // create activity log
              self.generateActivityContent(self.key, 'update', changeInfo,
                function(err, content) {
                  if (err) {
                    cb(err, updatedData);
                  } else {
                    if (content) {
                      self.logActivity(content);
                    }
                  }
                });
            }, function(err, results) {
              if (err) {
                callback(err, updatedData);
              }
            });
          }
          updatedData.populate("assignees", function(err, updatedData) {
            self.emitMessage(name, updatedData);

            signals.post_patch.send(updatedData, {
              instance: updatedData,
              changeFields: changeFields,
              originData: originData,
              socket: self.socket
            }, function(err, result) {});
          });

          // findByIdAndUpdate skips mongoose middleware
          // calling save again will updated the created date on the card/board
          self.modelClass.findOne({_id: _id}, function(err, model) {
            model.save();
          });
        }
      });
    }
  };

  module.exports = CardCRUD;

}(module));
