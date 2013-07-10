/*
 * Prdefined signals
 */

(function(module) {

  "use strict";

  var Signal = require("../services/signal");

  /*
   * Emit after CRUD function create executes successfully.
   *
   * Arguments:
   * - instance: the newly created object.
   * - socket: client socket.
   */
  module.exports.post_create = new Signal(["instance", "socket"]);

  /*
   * Emit after CRUD function delete executes successfully.
   *
   * Arguments:
   * - instance: the deleted object.
   * - socket: client socket.
   */
  module.exports.post_delete = new Signal(["instance", "socket"]);

  /*
   * Emit after CRUD function patch executes successfully.
   *
   * Arguments:
   * - instance: the just updated object.
   * - socket: client socket.
   */
  module.exports.post_patch = new Signal(["instance", "socket"]);

  /*
   * Emit after CRUD function read executes successfully.
   *
   * Arguments:
   * - instances: objects returned back to client.
   * - socket: client socket.
   */
  module.exports.post_read = new Signal(["instances", "socket"]);

  /*
   * Emit after CRUD function read executes successfully.
   *
   * Arguments:
   * - instance: the updated object.
   * - socket: client socket.
   */
  module.exports.post_update = new Signal(["instance", "socket"]);

}(module));
