
(function(module) {

  "use strict";

  var util = require("util");
  var BaseCRUD = require("./base");
  var signals = require("../signals");

  function CardLabelRelationCRUD(options) {
    BaseCRUD.call(this, options);

    this.createEnabled = false;
    this.updateEnabled = false;

    this.modelClass = require("../../models/cardLabelRelation");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(CardLabelRelationCRUD, BaseCRUD);

  CardLabelRelationCRUD.prototype._read = function(data, callback) {
    if (data) {
      this.modelClass
        .find(data)
        .populate('labelId')
        .exec(function (err, result) {
          callback(err, result);
        });
    } else {
      this.modelClass.find({}, callback);
    }
  };

  CardLabelRelationCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data._id; // _id is not modifiable

    this.modelClass.findByIdAndUpdate(_id, data)
      .populate("boardId cardId labelId")
      .exec(function (err, updatedData) {
        if (err) {
          callback(err, updatedData);
        } else {
          self.emitMessage(name, updatedData);

          signals.post_patch.send(updatedData, {
            instance: updatedData,
            socket: self.socket
          }, function(err, result) {});

        }
      });
  };

  module.exports = CardLabelRelationCRUD;

}(module));
