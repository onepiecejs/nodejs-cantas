
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
  var makePassword = function(rawPassword) {
    var salt = utils.randomString();
    var hash = crypto.pbkdf2Sync(rawPassword, salt, ITERATIONS, MAXLEN).toString('hex');
    return [ALGORIGTHM, ITERATIONS, salt, hash].join(PASSWORD_SEPARATOR);
  };

  var checkPassword = function(rawPassword, password) {
    var parts = password.split(PASSWORD_SEPARATOR);
    var iterations = parseInt(parts[1], 10);
    var salt = parts[2];
    var originalHash = parts[3];
    var hash = crypto.pbkdf2Sync(rawPassword, salt, iterations, MAXLEN);
    return hash.toString('hex') === originalHash;
  };

  /*
   * Create user account on behalf of user if it does not exist yet
   *
   * The user account will be returned via the callback function.
   */
  var createUserIfNotExist = function(displayName, email, callback) {
    var User = require('../../models/user');
    User.findOne({email: email}, function(err, user) {
      if (err) {
        return callback(err, null);
      }
      if (user) {
        callback(null, user);
      } else {
        new User({displayName: displayName, email: email}).save(function(err, savedUser) {
          if (err) {
            callback(err, null);
          } else {
            savedUser.setUnusablePassword(function(result) {
              // Although this should not happen in most cases, if this really happens,
              // let's ignore it and leave warning message for further debug.
              if (!result) {
                console.warn('Cannot set unusable password to user ' + email);
              }
              callback(null, savedUser);
            });
          }
        });
      }
    });
  };

  module.exports = {
    'checkPassword': checkPassword,
    'createUserIfNotExist': createUserIfNotExist,
    'makePassword': makePassword
  };

}(module));
