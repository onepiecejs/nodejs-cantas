
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
          listId = data.changed_data.listId;
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
                                model, data.changed_data.title, data.origin_data[data.field],
                                data.changed_data[data.field]);

          if (data.field === 'isArchived') {
            if (data.changed_data[data.field] === true) {
              content = util.format('%s archived %s "%s" from list "%s"',
                        username, model, data.changed_data.title, list.title);
              callback(null, content);
            }
            if (data.changed_data[data.field] === false) {
              content = util.format('%s unarchived %s "%s" to list "%s"',
                        username, model, data.changed_data.title, list.title);
              callback(null, content);
            }
          }

          if (data.field === 'listId') {
            List.findOne({_id: data.origin_data[data.field]}, 'title', function(err, fromList) {
              if (err) {
                return callback(err, null);
              }
              content = util.format('%s moved %s "%s" from list "%s" to list "%s"',
                          username, model, data.changed_data.title, fromList.title, list.title);
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
    var _id = data._id || data.id;
    var name = '/' + this.key + '/' + _id + ':update';
    // _id is not modifiable 
    delete data._id;
    var origin_data = data.original;
    var change_fields = [];
    var key;
    for (key in origin_data) {
      if (origin_data.hasOwnProperty(key)) {
        change_fields.push(key);
      }
    }
    delete data.original;

    if (data.assignees) {
      async.waterfall([
        function(callback) {
          // update card assignees
          self.modelClass.findById(_id, function (err, card) {
            if (err) {
              callback(err, card);
            } else {
              var newAssignees = [];
              data.assignees.forEach(function(assignee) {
                if (card.assignees.indexOf(assignee) === -1) {
                  newAssignees.push(assignee);
                }
              });
              card.assignees = data.assignees;
              card.save(function(err, updatedCard) {
                if (err) {
                  callback(err, updatedCard);
                } else {
                  callback(null, updatedCard, newAssignees);
                }
              });
            }
          });
        },
        function(updatedCard, newAssignees, callback) {
          // send notification to new assignees
          if (newAssignees.length) {
            var assigner = self.socket.getCurrentUser();
            User.find({_id: {$in: newAssignees}}, function(err, users) {
              users.forEach(function(assignee) {
                var safeTitle = cantasUtils.safeMarkdownString(updatedCard.title);
                var msg = util.format("%s assign card [%s](%s) to you.",
                  assigner.username, safeTitle, updatedCard.url);
                notification.notify(self.socket, assignee, msg, notification.types.information, {
                  body: {
                    assigner: assigner.username,
                    assignee: assignee.username,
                    cardTitle: updatedCard.title,
                    cardUrl: Sites.currentSite() + updatedCard.url
                  },
                  template: "assign.jade"
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
            // create activity log
            if (change_fields.length >= 1) {
              async.map(change_fields, function(change_field, cb) {
                var changeInfo = {
                  field: change_field,
                  origin_data: origin_data,
                  changed_data: updatedData
                };
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
            });
          }
        });
    }
  };

  module.exports = CardCRUD;

}(module));
