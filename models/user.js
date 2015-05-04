(function(module) {

  "use strict";

  var authUtils = require('../services/auth/utils');
  var servicesUtils = require('../services/utils');
  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var UserSchema;

  var MAX_PASSWORD_LENGTH = 64;

  UserSchema = new Schema({
    displayName: { type: String, required: true, match: /^[\w ]+$/ },
    password: { type: String, default: '', select: false },
    email: { type: String, required: true, lowercase: true, unique: true },
    joined: { type: Date, default: Date.now },
    roles: [ ObjectId ],
    isFirstLogin: { type: Boolean, default: true }
  });

  // static method

  UserSchema.statics.exists = function(email, callback) {
    this.findOne({email: email}, '_id', function(err, user) {
      callback(user !== undefined && user !== null);
    });
  };

  // Instance methods

  UserSchema.methods.verifyUserPassword = function(password) {
    if (password === undefined || password === null || password.length === 0) {
      throw new Error('No password to set.');
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error('Password is too long.');
    }
  };

  /*
   * Set user's password.
   */
  UserSchema.methods.setPassword = function(rawPassword, callback) {
    this.verifyUserPassword(rawPassword);
    var password = authUtils.makePassword(rawPassword);
    var model = this.model('User');
    model.findByIdAndUpdate(this._id, {$set: {password: password}}, function(err, user) {
      callback(err === null);
    });
  };

  /*
   * Set an unusable password to user.
   */
  UserSchema.methods.setUnusablePassword = function(callback) {
    var password = servicesUtils.randomString();
    this.setPassword(password, callback);
  };

  /*
   * Check whether user has a password.
   */
  UserSchema.methods.checkPassword = function(rawPassword, callback) {
    this.verifyUserPassword(rawPassword);
    this.model('User').findById(this._id, 'password', function(err, user) {
      if (err) {
        callback(false);
      } else {
        var isValid = authUtils.checkPassword(rawPassword, user.password);
        callback(isValid);
      }
    });
  };

  module.exports = mongoose.model('User', UserSchema);

}(module));

