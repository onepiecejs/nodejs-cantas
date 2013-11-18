
(function(module) {

  'use strict';

  var passport = require('passport');
  var mongoose = require('mongoose');
  var User = require('../../models/user');
  var strategies = require('./strategies');

  function findUserById(id, fn) {
    var ObjectId = mongoose.Types.ObjectId;
    User.findById({ _id: new ObjectId(id) }, function(err, user) {
      if (err || user === null) {
        fn(new Error('User ' + id + ' does not exist'));
      }

      fn(null, user);
    });
  }

  // Passport session setup.
  // To support persistent login sessions, Passport needs to be able to
  // serialize users into and deserialize users out of the session.  Typically,
  // this will be as simple as storing the user ID when serializing, and finding
  // the user by ID when deserializing.
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    findUserById(id, function (err, user) {
      done(err, user);
    });
  });

  // Set strategies for authentication.
  var key;
  for (key in strategies) {
    if (strategies.hasOwnProperty(key)) {
      passport.use(strategies[key]);
    }
  }

  module.exports = passport;

}(module));
