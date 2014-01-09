
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

  function CardCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/card");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(CardCRUD, BaseCRUD);

  CardCRUD.prototype.generateActivityContent = function(model, action, data, callback) {
    var content = null;
    var username = this.handshake.user.username;
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
          content = util.format('%s added %s "%s" in list "%s"', username, model,
            createdObject.title, list.title);
          if (sourceObject) {
            content = util.format('%s converted %s "%s" to %s "%s" in list "%s"',
              username, sourceObject.model, sourceObject.title,
              model, createdObject.title, list.title);
          }
          callback(null, content);
        }
        if (action === 'update') {
          content = util.format('%s changed %s of %s "%s" from "%s" to "%s"', username, data.field,
                                model, data.changedData.title, data.originData[data.field],
                                data.changedData[data.field]);

          if (data.field === 'isArchived') {
            if (data.changedData[data.field] === true) {
              content = util.format('%s archived %s "%s" from list "%s"',
                        username, model, data.changedData.title, list.title);
              callback(null, content);
            }
            if (data.changedData[data.field] === false) {
              content = util.format('%s unarchived %s "%s" to list "%s"',
                        username, model, data.changedData.title, list.title);
              callback(null, content);
            }
          }

          if (data.field === 'listId') {
            List.findOne({_id: data.originData[data.field]}, 'title', function(err, fromList) {
              if (err) {
                return callback(err, null);
              }
              content = util.format('%s moved %s "%s" from list "%s" to list "%s"',
                          username, model, data.changedData.title, fromList.title, list.title);
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
    if (data) {
      if (data._id) {
        this.modelClass.findOne(data).populate("assignees").exec(
          function (err, result) {
            callback(err, result);
          }
        );
      } else {
        this.modelClass.find(data).populate("assignees").exec(
          function (err, result) {
            async.map(
              result,
              function(card, callback) {
                var transformed = card.toJSON();
                async.parallel([
                  function(callback) {
                    card.getBadges(function(err, badges) {
                      transformed.badges = badges;
                      callback(null, transformed.badges);
                    });
                  },
                  function(callback) {
                    card.getCover(function(err, cover) {
                      transformed.cover = cover;
                      callback(null, transformed.cover);
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
                  assigner.username, safeTitle, updatedCard.url);
                if (assigner.username !== assignee.username) {
                  notification.notify(self.socket, assignee, msg, notification.types.information);
                  notification.mail(self.socket, assignee, msg, notification.types.information, {
                    body: {
                      assigner: assigner.username,
                      assignee: assignee.username,
                      cardTitle: updatedCard.title,
                      cardUrl: Sites.currentSite() + updatedCard.url
                    },
                    template: "assign.jade",
                  });
                }
                // send notification to subscribers.
                updatedCard.getSubscribeUsers(function(err, subscribeUsers) {
                  var notifyMsg = util.format("%s assigned card [%s](%s) to %s.",
                    assigner.username, safeTitle, updatedCard.url, assignee.username);
                  subscribeUsers.forEach(function(subscriber) {
                    if (assigner.username === subscriber.username) {
                      notifyMsg = util.format("you assigned card [%s](%s) to %s.",
                        safeTitle, updatedCard.url, assignee.username);
                    }
                    if (assignee.username !== subscriber.username) {
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
                  assigner.username, safeTitle, updatedCard.url);
                if (assigner.username !== assignee.username) {
                  notification.notify(self.socket, assignee, msg, notification.types.information);
                  notification.mail(self.socket, assignee, msg, notification.types.information, {
                    body: {
                      assigner: assigner.username,
                      assignee: assignee.username,
                      cardTitle: updatedCard.title,
                      cardUrl: Sites.currentSite() + updatedCard.url
                    },
                    template: "assign.jade",
                  });
                }
                // send notification to subscribers.
                updatedCard.getSubscribeUsers(function(err, subscribeUsers) {
                  var notifyMsg = util.format("%s cancelled assignment of card [%s](%s) to %s.",
                    assigner.username, safeTitle, updatedCard.url, assignee.username);
                  subscribeUsers.forEach(function(subscriber) {
                    if (assigner.username === subscriber.username) {
                      notifyMsg = util.format("you cancelled assignment of card [%s](%s) to %s.",
                        safeTitle, updatedCard.url, assignee.username);
                    }
                    if (assignee.username !== subscriber.username) {
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
      this.modelClass.findByIdAndUpdate(_id,
                                        {$set : data},
                                        function (err, updatedData) {
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
          }
        });
    }
  };

  module.exports = CardCRUD;

}(module));
