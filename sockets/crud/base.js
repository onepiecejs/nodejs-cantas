/*
 * BaseCRUD provides basic capabilities to handle socket event. Please do not
 * use this directly.
 */
(function (module) {

  "use strict";

  var mongoose = require("mongoose");
  var util = require("util");
  var async = require("async");
  var Activity = require("../../models/activity");
  var List = require("../../models/list");
  var BoardMemberRelation = require("../../models/boardMemberRelation");
  var LogActivity = require("../../services/activity").Activity;
  var signals = require("../signals");

  /*
   * Constructor to create an object to provide CRUD methods.
   *
   * Arguments:
   * options must contains following parameters.
   * - socket: object of socket representing client
   * - handshake: the handshake of socket.io
   */
  function BaseCRUD(options) {
    this.createEnabled = true;
    this.readEnabled = true;
    this.patchEnabled = true;
    this.updateEnabled = true;
    this.deleteEnabled = false;

    // Following two member variables should be assigned in concrete definition
    // of CRUD class.
    this.modelClass = undefined;
    this.key = undefined;
    this.socket = options.socket;
    this.handshake = options.handshake;
    // By default, broadcast event all client.
    this.exceptMe = false;

    /*
     * FIXME: Is this necessary for CRUD? 
     * In the original crud.js, this variable is used never.
     */
    // The user's session id is found in the handshake
    this.sessionID = this.handshake.sessionID;
  }

  BaseCRUD.prototype.isBoardMember = function(callback) {

    // check member relation
    var user = this.socket.getCurrentUser();
    var boardId = this.socket.getCurrentBoardId();
    BoardMemberRelation.isBoardMember(user._id, boardId, function(err, isMember) {
      callback(err, isMember);
    });
  };

  /*
   * A convenient way to send message back to client via socket
   */
  BaseCRUD.prototype.emitMessage = function(eventName, data) {
    this.socket.room.emit(eventName, data, { exceptMe: this.exceptMe });
  };

  BaseCRUD.prototype.generateActivityContent = function(model, action, data, callback) {
    var content = null;
    var username = this.handshake.user.username;
    var self = this;
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
      content = util.format('%s changed %s %s from "%s" to "%s"', username, model,
                data.field, data.originData[data.field], data.changedData[data.field]);
    }
    callback(null, content);
  };

  BaseCRUD.prototype.logActivity = function(content) {
    var self = this;
    var username = self.handshake.user.username;
    var boardId = self.socket.getCurrentBoardId();
    var creatorId = this.socket.handshake.user._id;
    var data = {
      content: content,
      creatorId: creatorId,
      boardId: boardId
    };
    var activity = new LogActivity({
      socket: self.socket,
      exceptMe: self.exceptMe
    });

    activity.log(data);
  };

  /*
   * FIXME: what the purpose of these code???
   * In the original crud.js module, this condition is used to control
   * whether to handle socket events by listening crud methods according
   * to whether either of these argument exists.
   * For not change the purpose in this refactor, keep the condition same as
   * origin, and use member variable disabled to disable the listen function.
   */
  BaseCRUD.prototype.disabled = function() {
    // No point in continuing without the required references
    if (!this.modelClass || !this.key || !this.socket || !this.handshake) {
      return true;
    }
    return false;
  };

  /*
   * Default event handlers.
   * Each of these provides default behavior to handle related socket event.
   * In the normal cases, subclass calls each of these if it wants the default
   * operations after subclass-specific things done.
   */
  BaseCRUD.prototype._create = function(data, callback) {
    var sourceObject = data.sourceObject;
    if (sourceObject) {
      delete data.sourceObject;
    }

    var t = new this.modelClass(data),
      name = '/' + this.key + ':create';
    var self = this;

    t.save(function (err, createdObject) {
      if (err) {
        callback(err, createdObject);
      } else {
        var data = {
          createdObject: createdObject,
          sourceObject: sourceObject
        };
        self.generateActivityContent(self.key, 'create', data, function(err, content) {
          if (err) {
            console.log(err);
          } else {
            if (content) {
              self.logActivity(content);
            }
          }
        });
        self.emitMessage(name, t);

        signals.post_create.send(createdObject, {
          instance: createdObject,
          socket: self.socket
        }, function(err, result) {});
      }
    });
  };

  BaseCRUD.prototype._read = function(data, callback) {
    if (data) {
      // FIXME: it is not necessary to identify whether _id exists.
      //        Merge these condition branch into one by calling
      //        ModelClass.find to return a uniform value in an array.
      //
      //        For example, if there is an _id in data, the returned array
      //        will contain one related object only. Otherwise, all quried
      //        objects appear in array.
      if (data._id) {
        this.modelClass.findOne(
          data,
          function (err, result) {
            callback(err, result);
          }
        );
      } else {
        this.modelClass.find(
          data,
          function (err, result) {
            callback(err, result);
          }
        );
      }
    } else {
      this.modelClass.find({}, callback);
    }
  };

  BaseCRUD.prototype._generatePatchInfo = function(data) {
    var _id = data._id || data.id;
    delete data._id;
    var originData = data.original;
    var changeFields = [];
    var key;
    for (key in originData) {
      if (originData.hasOwnProperty(key)) {
        changeFields.push(key);
      }
    }
    delete data.original;
    var patchInfo = {
      id: _id,
      data: data,
      originData: originData,
      changeFields: changeFields
    };
    return patchInfo;
  };

  BaseCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var patchInfo = self._generatePatchInfo(data);
    //var _id = data._id || data.id;
    var _id = patchInfo.id || null;
    var eventKey = '/' + this.key + '/' + _id + ':update';
    data = patchInfo.data;
    var originData = patchInfo.originData;
    var changeFields = patchInfo.changeFields;

    this.modelClass.findByIdAndUpdate(_id,
                                      {$set : data},
                                      function (err, updatedData) {
        if (err) {
          callback(err, updatedData);
        } else {

          // create activity log
          if (changeFields.length >= 1) {
            async.map(changeFields, function(changeField, cb) {
              var changeInfo = {
                field: changeField,
                originData: originData,
                changedData: updatedData
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

          self.emitMessage(eventKey, updatedData);

          signals.post_patch.send(updatedData, {
            instance: updatedData,
            socket: self.socket
          }, function(err, result) {});
        }

      });
  };

  BaseCRUD.prototype._update = function(data, callback) {
    var self = this;
    var name, field;
    if (data && data._id) {
      field = data._id;
      name = '/' + this.key + '/' + field + ':update';
      field = mongoose.Types.ObjectId(field);
      this.modelClass.findById(field, function (err, result) {
        if (err) {
          callback(err, data);
        } else {
          // iterate all keys and give assignments.
          // ensure `result` isn't null.
          if (result) {
            var attr;
            for (attr in data) {
              if (data.hasOwnProperty(attr)) {
                result[attr] = data[attr];
              }
            }
            result.save(function (err) {
              // Note that `silence` here controls whether to publish event.
              // we don't want those *related* object's update triggers an event.
              // note the difference between `silence` and the backbone
              // builtin `silent`: http://backbonejs.org/#Model-set
              if (!data.silence) {
                self.emitMessage(name, result);
              }
            });
          }
        }
      });
    }
  };

  BaseCRUD.prototype._delete = function(data, callback) {
    var self = this;

    if (data && data._id) {
      var field = data._id;
      var name = '/' + this.key + '/' + field + ':delete';

      this.modelClass.findByIdAndRemove(data._id, function(err, removedObject) {
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

  /*
   * Real event handlers that will be called when related socket event is coming.
   * In this base class, they call related default handlers to proceed the
   * operation simply. Subclass can override each of these according to
   * requirement.
   */
  BaseCRUD.prototype.patch = function(data, callback) {
    this._patch(data, callback);
  };

  BaseCRUD.prototype.update = function(data, callback) {
    this._update(data, callback);
  };

  BaseCRUD.prototype.read = function(data, callback) {
    this._read(data, callback);
  };

  /*jslint es5: true */
  BaseCRUD.prototype.delete = function(data, callback) {
    this._delete(data, callback);
  };

  BaseCRUD.prototype.create = function(data, callback) {
    this._create(data, callback);
  };

  BaseCRUD.prototype.listen = function() {
    if (this.disabled()) {
      return;
    }

    var self = this;

    if (this.createEnabled) {
      this.socket.on(this.key + ':create', function (data, callback) {
        self.create(data, callback);
      });
    }

    if (this.readEnabled) {
      this.socket.on(this.key + ':read', function (data, callback) {
        self.read(data, callback);
      });
    }

    if (this.updateEnabled) {
      this.socket.on(this.key + ':update', function (data, callback) {
        self.update(data, callback);
      });
    }

    if (this.patchEnabled) {
      this.socket.on(this.key + ':patch', function (data, callback) {
        self.patch(data, callback);
      });
    }

    if (this.deleteEnabled) {
      this.socket.on(this.key + ':delete', function (data, callback) {
        /*jslint es5: true */
        self.delete(data, callback);
      });
    }

  };

  module.exports = BaseCRUD;

}(module));
