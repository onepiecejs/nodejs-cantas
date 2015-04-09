
(function(module) {

  'use strict';

  var crypto = require('crypto');
  var utils = require('../utils.js');

  var ALGORIGTHM = 'pbkdf2';
  var ITERATIONS = 24000;
  var MAXLEN = 64;
  var PASSWORD_SEPARATOR = '$';

  /*
   * pbkdf2 is used for making and checking password.
   *
   * Because we have to support 0.10.x of nodejs, SHA1 is used.
   */
  module.exports.makePassword = function(rawPassword) {
    var salt = utils.randomString();
    var hash = crypto.pbkdf2Sync(rawPassword, salt, ITERATIONS, MAXLEN).toString('hex');
    return [ALGORIGTHM, ITERATIONS, salt, hash].join(PASSWORD_SEPARATOR);
  };

  module.exports.checkPassword = function(rawPassword, password) {
    var parts = password.split(PASSWORD_SEPARATOR);
    var iterations = parseInt(parts[1], 10);
    var salt = parts[2];
    var originalHash = parts[3];
    var hash = crypto.pbkdf2Sync(rawPassword, salt, iterations, MAXLEN);
    return hash.toString('hex') === originalHash;
  };

}(module));
