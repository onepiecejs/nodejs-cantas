(function(module) {

  "use strict";

  // TODO: Try to remove async dependency.
  var async = require("async");

  /*
   * Constructor for Signal.
   *
   * Arguments:
   * All arguments are passed through options.
   * - providing_args: specification to claim that what argument should be
   *   passed to each receiver.
   */
  function Signal(options) {
    /*
     * Receivers holds the relation between model and handlers (functions).
     * The relation between model and handlers is a one-to-many relationship.
     *
     * We can use following hash lookup operation to get all handles that want
     * to deal with signals from that model's object.
     *
     * var handlers = this._receivers[modelName];
     */
    this._receivers = {};

    var opts = options || {};
    this._providing_args = opts.providing_args || [];
  }

  /*
   * Connect a receiver to this signal.
   *
   * Arguments:
   * - sender: a model to indicate that from which models' objects this signal
   *   is emitted.
   * - receiver: a function that will be triggered when signal is emitted.
   */
  Signal.prototype.connect = function(sender, receiver) {
    if (typeof receiver !== "function") {
      throw new TypeError("receiver must be a function object.");
    }

    var modelName = sender.modelName;
    if (modelName === undefined) {
      throw new TypeError("sender should be a model object defined in mongoose' Schema.");
    }

    var receivers = this._receivers[modelName];
    if (receivers === undefined) {
      this._receivers[modelName] = [receiver];
    } else {
      receivers.push(receiver);
    }
  };

  /*
   * Disconnect the receiver from signal.
   *
   * There are three ways to disconnect.
   * - If you provide both these two argument, the specific receiver will be
   *   disconnected.
   * - If you only provide sender, all receivers connected for that model will
   *   be disconnected.
   * - If none of receiver and sender is provided, all receivers will be
   *   disconnected.
   *
   * Arguments:
   * - sender: optional. Which model the receiver is connected for.
   * - receiver: optional. The receiver that has been connected to this signal.
   */
  Signal.prototype.disconnect = function(sender, receiver) {
    // Ensure once sender is passed, it should be a Model.
    if (sender && sender.modelName === undefined) {
      throw new TypeError("Sender must be a Model.");
    }
    // Ensure once receiver is passed, it should be a function.
    if (receiver && typeof receiver !== "function") {
      throw new TypeError("receiver must be a function.");
    }

    if (sender) {
      if (receiver) {
        // Remove specific receiver for Model
        var i = this._receivers[sender.modelName].indexOf(receiver);
        if (i >= 0) {
          delete this._receivers[sender.modelName][i];
        }
      } else {
        // Remove all receivers for Model
        this._receivers[sender.modelName] = [];
      }
    } else {
      if (receiver) {
        throw new Error("Cannot disconnect a receiver when sender is unavailable.");
      } else {
        // Remove all receivers
        this._receivers = {};
      }
    }
  };

  function generateFuncTask(sender, args, funcReceiver, asyncCallback) {
    // This function returns task which will pass to async.parallel
    var funcTask = function(asyncCallback) {
      var func = funcReceiver;
      // This is the real receiver call within each task.
      func(sender, args, function(err, result) {
        // Here is the callback function named done called when each receiver
        // finishes its work. Receiver must call this callback.
        asyncCallback(null, {err: err || null, receiver: func, result: result});
      });
    };
    return funcTask;
  }

  /*
   * Trigger this signal to get all receivers be called.
   *
   * Before sending signal, argument args will be checked to satisfy the
   * providing_args claimed when initialize this signal. If there is missing
   * argument, exception is raised immediately due to it's not a runtime error.
   *
   * Arguments:
   * - sender: from which model's object.
   * - args: a hash containing all necessary arguments claimed when initialize
   *   this signal.
   * - callback: optional. Called after all receivers' works done. Error object and a list
   *   of 3-element array [{err: error, receiver: object, result: true|false}]
   *   will be passed to this callback. If there is no error after a receiver
   *   finishes, the related err is null and the third one is true. Otherwise,
   *   err is an object, and the last one is false.
   *
   * When there is no receivers, function send returns immediately and callback
   * will be called by passing an empty Array as the result.
   */
  Signal.prototype.send = function(sender, args, callback) {
    var isSenderInvalid = !sender || sender.constructor === undefined ||
                          sender.constructor.modelName === undefined;
    if (isSenderInvalid) {
      throw new Error("sender is not an object of mongoose' Model.");
    }

    // To allow callback is optional.
    var _callback = typeof args === "function" && callback === undefined ? args : callback;
    // I want an empty object {} is sent, when args is not provided.
    var _args = args && typeof args !== "function" ? args : {};

    // To check whether args are satisfied with providing_args
    if (this._providing_args.length > 0) {
      if (this._isEmptyObject(_args)) {
        _callback(new Error("No arguments are provided."), null);
        return;
      }
      var i;
      for (i = 0; i < this._providing_args.length; i++) {
        var argname = this._providing_args[i];
        var exists = _args.hasOwnProperty(argname);
        if (!exists) {
          var err = new Error(argname + " does not in providing arguments.");
          _callback(err, null);
          return;
        }
      }
    }

    // Prepare to call receivers
    var modelName = sender.constructor.modelName;
    var receiversToSend = this._receivers[modelName] || [];
    // Build function array to pass to async.parallel
    var tasksToExec = [];
    var j;
    for (j = 0; j < receiversToSend.length; j++) {
      var funcReceiver = receiversToSend[j];
      var funcTask = generateFuncTask(sender, args, funcReceiver);
      tasksToExec.push(funcTask);
    }

    async.parallel(tasksToExec, function(err, results) {
      if (_callback) {
        _callback(err, results);
      }
    });
  };

  Signal.prototype._isEmptyObject = function(obj) {
    var key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  };

  module.exports = Signal;

}(module));
