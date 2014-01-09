
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var signals = require("../signals");

  function CommentCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/comment");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(CommentCRUD, BaseCRUD);

  CommentCRUD.prototype._create = function(data, callback) {
    var t = new this.modelClass(data), name = '/' + this.key + ':create';
    var self = this;

    t.save(function (err, savedObject) {
      savedObject.populate('authorId', function(err, comment) {
        if (!err) {
          self.emitMessage(name, comment);

          signals.post_create.send(comment, {
            instance: comment,
            socket: self.socket
          }, function(err, result) {});
        }
      });
    });
  };

  CommentCRUD.prototype._read = function(data, callback) {
    if (data) {
      if (data._id) {
        this.modelClass.findOne(data).populate("authorId").exec(
          function (err, result) {
            callback(err, result);
          }
        );
      } else {
        this.modelClass.find(data).populate("authorId").sort({'createdOn': 'asc'}).exec(
          function (err, result) {
            callback(err, result);
          }
        );
      }
    } else {
      this.modelClass.find({}).populate("authorId").sort({'createdOn': 'asc'}).exec(callback);
    }
  };

  CommentCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var patchInfo = self._generatePatchInfo(data);
    var _id = patchInfo.id;
    var name = '/' + this.key + '/' + _id + ':update';
    var originData = patchInfo.originData;
    var changeFields = patchInfo.changeFields;
    data = patchInfo.data;

    async.waterfall([
      function(callback) {
        // check permission
        self.modelClass.findById(_id, function(err, comment) {
          if (err) {
            callback(err, null);
          } else {
            var userId = self.socket.handshake.user._id;
            var authorId = comment.authorId;
            if (authorId.toString() !== userId.toString()) {
              callback("Error: you do not have permission to edit this comment.", null);
            } else {
              callback(null);
            }
          }
        });
      },
      function(callback) {
        // update comment content
        data.updatedOn = Date.now();
        self.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
          callback(err, updatedData);
        });
      }
    ], function(err, updatedData) {
      if (err) {
        callback(err, null);
      } else {
        updatedData.populate("authorId", function(err, updatedData) {
          self.emitMessage(name, updatedData);
          signals.post_patch.send(updatedData, {
            instance: updatedData,
            originData: originData,
            changeFields: changeFields,
            socket: self.socket
          }, function(err, result) {});

        });
      }
    });
  };

  module.exports = CommentCRUD;

}(module));
