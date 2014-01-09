
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var Card = require('../../models/card');

  function ListCRUD(modelClass) {
    BaseCRUD.call(this, modelClass);

    this.modelClass = require("../../models/list");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(ListCRUD, BaseCRUD);

  ListCRUD.prototype.generateActivityContent = function(model, action, data, callback) {
    var content = null;
    var username = this.handshake.user.username;
    if (action === 'create') {
      var createdObject = data.createdObject;
      var sourceObject = data.sourceObject;
      content = util.format('%s added %s "%s"', username, model, createdObject.title);
      if (sourceObject) {
        content = util.format('%s converted %s "%s" to %s "%s"', username, sourceObject.model,
                  sourceObject.title, model, createdObject.title);
      }
    }
    if (action === 'update') {
      content = util.format('%s changed %s %s from "%s" to "%s"',
        username, model, data.field, data.originData[data.field], data.changedData[data.field]);
      if (data.field === 'isArchived') {
        if (data.changedData[data.field] === true) {
          content = util.format('%s archived %s "%s"', username, model,
                                data.changedData.title);
        }
        if (data.changedData[data.field] === false) {
          content = util.format('%s unarchived %s "%s"', username, model,
                                data.changedData.title);
        }
      }
    }
    callback(null, content);
  };

  ListCRUD.prototype._logActivityWhenArchiveCards = function(updatedData) {
    var self = this;
    var username = self.handshake.user.username;
    this.modelClass.findOne({_id: updatedData.listId}, 'title', function(err, list) {
      if (list) {
        var content = util.format('%s archived card "%s" from list "%s"',
                      username, updatedData.title, list.title);
        self.logActivity(content);
      }
    });
  };

  ListCRUD.prototype._archiveAllCards = function(listId, callback) {
    var self = this;
    async.waterfall([
      function(callback) {
        Card.find({listId: listId, isArchived: false}, function(err, cards) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, cards);
          }
        });
      },
      function(cards, callback) {
        if (cards) {
          async.map(cards, function(card, callback) {
            card.isArchived = true;
            card.save(function(err, updatedCard) {
              if (err) {
                callback(err, null);
              } else {
                //create activity log
                self._logActivityWhenArchiveCards(updatedCard);
                callback(null, updatedCard);
              }
            });
          }, function(err, updatedCard) {
            callback(err, updatedCard);
          });
        }
      }
    ], function(err, updatedCardList) {
      callback(err, updatedCardList);
    });
  };

  ListCRUD.prototype.patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var username = this.handshake.user.username;

    if (data._archiveAllCards) {
      self._archiveAllCards(_id, function(err, updatedCardList) {
        var eventName = '/card:archiveAllCards';
        var data = {
          'listId': _id,
          'archivedCards': updatedCardList
        };
        self.emitMessage(eventName, data);
      });
    } else {
      this._patch(data, callback);
    }
  };

  module.exports = ListCRUD;

}(module));
