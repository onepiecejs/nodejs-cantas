
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var signals = require("../signals");

  function ChecklistItemCRUD(options) {
    BaseCRUD.call(this, options);

    this.deleteEnabled = true;

    this.modelClass = require("../../models/checklistItem");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(ChecklistItemCRUD, BaseCRUD);

  ChecklistItemCRUD.prototype._create = function(data, callback) {
    var t = new this.modelClass(data), name = '/' + this.key + ':create';
    var self = this;

    t.save(function (err, savedObject) {
      if (err) {
        callback(err, savedObject);
      } else {

        // TODO: log activity
        self.emitMessage(name, t);

        signals.post_create.send(savedObject, {
          instance: savedObject,
          socket: self.socket
        }, function(err, result) {});
      }
    });
  };

  ChecklistItemCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var patchInfo = self._generatePatchInfo(data);
    var _id = patchInfo.id;
    var name = '/' + this.key + '/' + _id + ':update';
    var originData = patchInfo.originData;
    var changeFields = patchInfo.changeFields;
    data = patchInfo.data;


    async.waterfall([
      function(callback) {
        self.isBoardMember(function(err, isMember) {
          callback(err, isMember);
        });
      },
      function(isMember, callback) {

        // patch if isMember
        if (isMember) {
          data.updatedOn = Date.now();
          self.modelClass
            .findByIdAndUpdate(_id, data)
            .exec(function(err, updatedData) {
              callback(err, updatedData);
            });
        } else {
          callback(true, null);
        }
      }
    ], function(err, updatedData) {
      if (err) {
        callback(err, null);
      } else {
        self.emitMessage(name, updatedData);

        signals.post_patch.send(updatedData, {
          instance: updatedData,
          changeFields: changeFields,
          originData: originData,
          socket: self.socket
        }, function(err, result) {});
      }
    });
  };

  module.exports = ChecklistItemCRUD;

}(module));
