
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var signals = require("../signals");

  function ChecklistCRUD(options) {
    BaseCRUD.call(this, options);

    this.deleteEnabled = true;

    this.modelClass = require("../../models/checklist");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(ChecklistCRUD, BaseCRUD);

  ChecklistCRUD.prototype._create = function(data, callback) {
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

  ChecklistCRUD.prototype._delete = function(data, callback) {
    var self = this;

    if (data && data._id) {
      var field = data._id;
      var name = '/' + this.key + '/' + field + ':delete';

      async.waterfall([
        function(callback) {
          self.isBoardMember(function(err, isMember) {
            callback(err, isMember);
          });
        },
        function(isMember, callback) {
          if (isMember) {
            self.modelClass.findByIdAndRemove(data._id, function(err, removedObject) {
              callback(err, removedObject);
            });
          } else {
            callback(true, null);
          }
        }
      ], function(err, removedObject) {
        if (err) {
          callback(err, data);
        } else {
          self.emitMessage(name, removedObject);

          signals.post_delete.send(removedObject, {
            instance: removedObject,
            socket: self.socket
          }, function(err, result) { });
        }
      });
    }
  };

  module.exports = ChecklistCRUD;

}(module));
