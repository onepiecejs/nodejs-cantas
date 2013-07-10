/*
 * BaseCRUD provides basic capabilities to handle socket event. Please do not
 * use this directly.
 */
(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Activity = require("../../models/activity");
  var List = require("../../models/list");
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

  /*
   * A convenient way to send message back to client via socket
   */
  BaseCRUD.prototype.emitMessage = function(eventName, data) {
    this.socket.room.emit(eventName, data, { exceptMe: this.exceptMe });
  };

  BaseCRUD.prototype.logActivity = function(key, data, action) {
    var username, content, boardId, creatorId, activityData, list;
    var self = this;

    // TODO: content should contain more info
    username = this.handshake.user.username
    boardId = this.socket.room.board.split(':')[1];
    creatorId = this.socket.handshake.user._id;

    if (key === 'list') {
      content = username + ' ' + action + ' ' + data.title + ' ' + 'in board';
      activityData = {
        'content': content,
        'creatorId': creatorId,
        'boardId': boardId
      };

      var t = new Activity(activityData)
      , name = '/activity:create';

      t.save(function (err) {
        if (err) {
          console.log(err);
        } else {
          self.socket.room.emit(name, t, { exceptMe: self.exceptMe });
        }
      });

    } else {

      // FIXME: why these code?
      if (data.listId) {
        List.findOne({_id : data.listId}, 'title', function(err, list) {
          if (err) {
            console.log(err)
          } else {
            content = username + ' ' + action + ' ' +  data.title + ' ' + 'in' + ' ' + list.title;
            activityData = {
              'content': content,
              'creatorId': creatorId,
              'boardId': boardId
            };

            var t = new Activity(activityData)
            , name = '/activity:create';

            t.save(function (err) {
              if (err) {
                console.log(err);
              } else {
                self.socket.room.emit(name, t, { exceptMe: self.exceptMe });
              }
            });
          }
        });
      }

    }
  }

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
    if (!this.modelClass || !this.key || !this.socket || !this.handshake)
      return true;
    else
      return false;
  };

  /*
   * Default event handlers.
   * Each of these provides default behavior to handle related socket event.
   * In the normal cases, subclass calls each of these if it wants the default
   * operations after subclass-specific things done.
   */
  BaseCRUD.prototype._create = function(data, callback) {
    var t = new this.modelClass(data)
      , name = '/' + this.key + ':create';
    var self = this;

    t.save(function (err, savedObject) {
      if (err) {
        callback(err, savedObject);
      } else {
        // TODO:
        self.logActivity(self.key, t, 'create');
        self.emitMessage(name, t);

        signals.post_create.send(savedObject, {
          instance: savedObject, socket: self.socket}, function(err, result){});
      }
    });
  };

  BaseCRUD.prototype._read = function(data, callback) {
    if (data){
      // FIXME: it is not necessary to identify whether _id exists.
      //        Merge these condition branch into one by calling
      //        ModelClass.find to return a uniform value in an array.
      //
      //        For example, if there is an _id in data, the returned array
      //        will contain one related object only. Otherwise, all quried
      //        objects appear in array.
      if (data._id){
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
      this.modelClass.find({}, callback );
    }
  };

  BaseCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data['_id']; // _id is not modifiable

    this.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
      if (err) {
        callback(err, updatedData);
      } else {
        // TODO:
        self.logActivity(self.key, updatedData, 'update');
        self.emitMessage(name, updatedData);

        signals.post_patch.send(updatedData, {
          instance: updatedData, socket: self.socket}, function(err, result) {});
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
          if(result){
            for (var attr in data) {
              result[attr] = data[attr];
            }
            result.save(function (err) {
              // Note that `silence` here controls whether to publish event.
              // we don't want those *related* object's update triggers an event.
              // note the difference between `silence` and the backbone
              // builtin `silent`: http://backbonejs.org/#Model-set
              if(!data.silence){
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

    this.logActivity(this.key, data, 'delete');

    if (data && data._id) {
      var field = data._id;
      var name = '/' + this.key + '/' + field + ':delete';

      this.modelClass.findByIdAndRemove(data._id, function(err, removedObject) {
        if (err) {
          callback(err, data);
        } else {
          self.emitMessage(name, removedObject);

          signals.post_delete.send(removedObject, {
            instance: removedObject, socket: self.socket
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
  }

  BaseCRUD.prototype.update = function(data, callback) {
    this._update(data, callback);
  }

  BaseCRUD.prototype.read = function(data, callback) {
    this._read(data, callback);
  }

  BaseCRUD.prototype.delete = function(data, callback) {
    this._delete(data, callback);
  }

  BaseCRUD.prototype.create = function(data, callback) {
    this._create(data, callback);
  }

  BaseCRUD.prototype.listen = function() {
    if (this.disabled())
      return;

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
        self.delete(data, callback);
      });
    }

  }

  module.exports = BaseCRUD;

})(module);
