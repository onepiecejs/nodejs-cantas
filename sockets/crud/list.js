
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

  ListCRUD.prototype.patch = function(data, callback) {
    var self = this;
    var _id = data._id;
    if (data._archiveAllCards){
      Card.find({listId: _id, isArchived: false}, function(err, cards){
        cards.forEach(function(card){
          card.isArchived = true;
          card.save(function(err, updatedData){
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
