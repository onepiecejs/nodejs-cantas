
(function(module) {

  "use strict";

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
      var createdObject = data['createdObject'];
      var sourceObject = data['sourceObject'];
      content = util.format('%s added %s "%s"', username, model, createdObject.title);
      if (sourceObject) {
        content = util.format('%s converted %s "%s" to %s "%s"', username, sourceObject.model,
                  sourceObject.title, model, createdObject.title);
      }
    }
    if (action === 'update') {
      content = util.format('%s changed %s %s from "%s" to "%s"',
        username, model, data.field, data.origin_data[data.field], data.changed_data[data.field]);
      if (data.field === 'isArchived') {
        if (data.changed_data[data.field] === true) {
          content = util.format('%s archived %s "%s"', username, model,
                                data.changed_data.title);
        }
        if (data.changed_data[data.field] === false) {
          content = util.format('%s unarchived %s "%s"', username, model,
                                data.changed_data.title);
        }
      }
    }
    callback(null, content);
  };

  ListCRUD.prototype._logActivityWhenArchiveCards = function(updatedData){
    var self = this;
    var username = self.handshake.user.username;
    this.modelClass.findOne({_id: updatedData.listId}, 'title', function(err, list) {
      if (err) {
        callback(err, null);
      } else {
        var content = util.format('%s archived card "%s" from list "%s"',
                      username, updatedData.title, list.title);
        self.logActivity(content);
      }
    });
  };

  ListCRUD.prototype.patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var username = this.handshake.user.username;

    if (data._archiveAllCards){
      Card.find({listId: _id, isArchived: false}, function(err, cards){
        cards.forEach(function(card){
          card.isArchived = true;
          card.save(function(err, updatedData){

            //create activity log
            self._logActivityWhenArchiveCards(updatedData);

            var name = '/card/' + card._id + ':update';
            self.emitMessage(name, updatedData);
          });
        });
      });
    }else{
      this._patch(data, callback);
    }
  }

  module.exports = ListCRUD;

})(module);
