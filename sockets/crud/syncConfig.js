
(function (module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var fs = require("fs");
  var BaseCRUD = require("./base");
  var signals = require("../signals");

  function SyncConfigCRUD(options) {
    BaseCRUD.call(this, options);

    this.deleteEnabled = true;
    this.listModelClass = require("../../models/list");
    this.listKey = this.listModelClass.modelName.toLowerCase();
    this.modelClass = require("../../models/syncConfig");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(SyncConfigCRUD, BaseCRUD);

  SyncConfigCRUD.prototype._create = function (data, callback) {
    var self = this;

    // create a syncconfig info based on a new list
    if (data.listId === '0') {
      async.waterfall([
        function (cb) {
          var model = {
            'title': data.listName,
            'creatorId': data.creatorId,
            'order': data.listOrder,
            'boardId': data.boardId
          };
          var listModel = new self.listModelClass(model);
          listModel.save(function (err, savedList) {
            if (err) {
              cb(err, null);
            } else {
              self.emitMessage('/' + self.listKey + ':create', savedList);
              cb(null, savedList.id);
            }
          });
        },
        function (listId, cb) {
          data.listId = listId;
          var syncConfigModel = new self.modelClass(data);
          syncConfigModel.save(function (err, savedSyncConfig) {
            if (err) {
              cb(err, null);
            } else {
              cb(null, savedSyncConfig);
            }
          });
        },
        function (savedSyncConfig, cb) {
          savedSyncConfig.populate('creatorId listId', function (err, syncConfig) {
            if (err) {
              cb(err, null);
            } else {
              cb(null, syncConfig);
            }
          });
        }
      ], function (err, syncConfig) {
        if (err) {
          callback(err, null);
        } else {
          self.emitMessage('/' + self.key + ':create', syncConfig);
          callback(null, syncConfig);
        }
      });
    } else {// create a syncconfig info based on a existing list
      var syncConfigModel = new self.modelClass(data);
      syncConfigModel.save(function (err, saveObject) {
        saveObject.populate('creatorId listId', function (err, syncConfig) {
          if (!err) {
            self.emitMessage('/' + self.key + ':create', syncConfig);
            callback(null, syncConfig);
          } else {
            callback(err, null);
          }
        });
      });
    }
  };

  SyncConfigCRUD.prototype._read = function (data, callback) {
    if (data) {
      if (data._id) {
        this.modelClass.findOne(data).populate('creatorId').exec(
          function (err, result) {
            callback(err, result);
          }
        );
      } else {
        this.modelClass.find(data).populate('creatorId listId').sort({'createdOn': 'asc'}).exec(
          function (err, result) {
            callback(err, result);
          }
        );
      }
    } else {
      this.modelClass.find({}).populate('creatorId boardId')
        .sort({'createdOn': 'asc'}).exec(callback);
    }
  };

  SyncConfigCRUD.prototype._delete = function (data, callback) {
    var self = this;

    if (data && data._id) {
      var name = '/' + this.key + '/' + data._id + ':delete';

      async.waterfall([
        function (callback) {
          self.isBoardMember(function(err, isMember) {
            callback(err, isMember);
          });
        },
        function (isMember, callback) {
          if (isMember) {
            self.modelClass.findByIdAndRemove(data._id, function(err, removedObject) {
              callback(err, removedObject);
            });
          } else {
            callback('Error: you do not have permission to delete this configuration.', null);
          }
        }
      ], function (err, removedObject) {
        if (err) {
          callback(err, data);
        } else {
          self.emitMessage(name, removedObject);
        }
      });
    }
  };

  SyncConfigCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var _boardId = data.boardId;
    var name = '/' + this.key + '/' + _id + ':update';

    // _id is not modifiable
    delete data._id;

    async.waterfall([
      function(cb) {
        // update a syncconfig info based on a new list
        if (data.listId === '0') {
          var model = {
            'title': data.listName,
            'creatorId': data.creatorId,
            'order': data.listOrder,
            'boardId': data.boardId
          };
          var listModel = new self.listModelClass(model);
          listModel.save(function (err, savedList) {
            if (err) {
              cb(err, null);
            } else {
              self.emitMessage('/' + self.listKey + ':create', savedList);
              cb(null, savedList.id);
            }
          });
        } else {// update a syncconfig info based on a existing list
          cb(null, null);
        }
      },
      function(listId, cb) {
        delete data.boardId;
        if (listId) {
          data.listId = listId;
        }
        data.updatedOn = Date.now();
        self.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
          if (err) {
            cb(err, null);
          } else {
            cb(null, updatedData);
          }
        });
      },
      function(updatedData, cb) {
        updatedData.populate('listId', function (err, syncConfig) {
          if (err) {
            cb(err, null);
          } else {
            cb(null, syncConfig);
          }
        });
      }
    ], function(err, syncConfig) {
      if (err) {
        callback(err, null);
      } else {
        self.emitMessage(name, syncConfig);
      }
    });
  };

  module.exports = SyncConfigCRUD;
}(module));
