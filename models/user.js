(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var UserSchema;

  UserSchema = new Schema({
    username: { type: String, required: true, lowercase: true, unique: true },
    fullname: { type: String, default: '' },
    password: { type: String, default: '', select: false },
    email: { type: String, required: true, lowercase: true, unique: true },
    joined: { type: Date, default: Date.now },
    roles: [ ObjectId ],
    isFirstLogin: { type: Boolean, default: true }
  });

  // static method

  UserSchema.statics.getByUsername = function(identity, callback) {
    var condition = { username: identity };
    this.findOne(condition, callback);
  };

  UserSchema.statics.exists = function(identity, callback) {
    var conditions = { $or: [{ username: identity }, { email: identity }] };
    this.findOne(conditions, "username", function(err, user) {
      callback(user !== undefined && user !== null);
    });
  };

  module.exports = mongoose.model('User', UserSchema);

}(module));

