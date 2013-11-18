/*
 * Settings module
 *
 * settings.json maintains all settings. All modules that require settings
 * just need load this module by calling require.
 *
 * Module exports a settings object to client.
 */

(function(module) {

  "use strict";

  module.exports = require("./settings.json");

}(module));
