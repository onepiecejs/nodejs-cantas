/*
 * Load all CRUD modules.
 */

(function(module) {

  "use strict";

  var fs = require("fs");
  var path = require("path");

  var _crudObjects = {};

  module.exports.crudObjects = _crudObjects;

  module.exports.setUp = function(socket, handshake) {
    var crudModules = fs.readdirSync(__dirname);
    // Do not import these modules, which are used internally.
    var excludeNames = ['index', 'base'];
    var i;
    for (i = 0; i < crudModules.length; i++) {
      if (path.extname(crudModules[i]) === ".js") {
        var cleanName = path.basename(crudModules[i], ".js");
        if (excludeNames.indexOf(cleanName) < 0) {
          var Class = require("./" + cleanName);
          var obj = new Class({ socket: socket, handshake: handshake });
          obj.listen();
          _crudObjects[obj.modelClass.modelName] = obj;
        }
      }
    }
  };

}(module));
