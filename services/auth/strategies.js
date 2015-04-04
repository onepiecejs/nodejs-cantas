/*
 * Authentication strategies.
 *
 * These strategies are used for authenticating requests from potential
 * clients. Strategy is the Strategy concept introduced by passport module. Any
 * problem about Strategy, please reference the documentation of passport
 * project.
 *
 * Strategies here is for configurable authentication in Cantas. In this way,
 * it is not necessary to touch the core authentication code when you want to
 * switch one strategy to another. Instead, change `auth.strategy` in
 * `settings.json` is enough.
 *
 * This module also gives you chance to determine what strategies are provided.
 */

(function(module) {

  'use strict';

  var krb5 = require('node-krb5');
  var LocalStrategy = require('passport-local').Strategy;
  var RemoteUserStrategy = require('./remoteUserStrategy');
  var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
  var settings = require('../../settings');
  var User = require('../../models/user');
  var utils = require('../utils');
  var sites = require('../sites');

  /*
   * Local strategy by authenticating user credential username and password from database.
   */
  var CantasLocalUserStrategy = new LocalStrategy(function(username, password, done) {
    process.nextTick(function() {
      User.findOne({username: username}, "password", function(err, user) {
        if (err) {
          done(null, false, {message: "Cannot authentication user " + username});
        } else if (user === null) {
          done(null, false, {message: "Invalid username or password"});
        } else {
          user.checkPassword(password, function(isValid) {
            if (isValid) {
              User.findById(user._id, function(err, user) {
                done(null, user);
              });
            } else {
              done(null, false, {message: "Invalid username or password."});
            }
          });
        }
      });
    });
  });

  var CantasKerberosStrategy = new LocalStrategy(function(username, password, done) {
    // asynchronous verification, for performance concern.
    process.nextTick(function() {
      // IMPORTANT! NEVER store or log password here. It violates infosec policy!
      var principal = utils.build_krb5_user_principal(username, settings.realm);
      krb5.authenticate(principal, password, function (err) {
        if (err) {
          done(null, false, {message: 'Invalid Kerberos username or password.'});
        } else {
          User.findOne({username: username}, function (err, user) {
            if (user === null) {
              // A new user
              var newUser = new User({
                username: username,
                email: username + '@' + settings.realm.toLowerCase()
              });
              newUser.save(function(err, savedUser) {
                savedUser.setUnusablePassword(function(result) {
                  done(null, savedUser);
                });
              });
            } else {
              done(null, user);
            }
          });
        }
      });
    });
  });
  CantasKerberosStrategy.name = 'kerberos';

  /**
   * REMOTE_USER strategy use
   */
  var findByToken = function(token, fn) {
    var username = token.split('@')[0];
    User.findOne({username: username}, function (err, user) {
      if (err) {
        fn(new Error('User ' + token + ' does not exist'));
      }

      if (user === null) {
        // A new user
        var newUser = new User({
          username: username,
          email: username + '@' + settings.realm.toLowerCase()
        });
        newUser.save(function (err, savedUser) {
          savedUser.setUnusablePassword(function(result) {
            fn(null, newUser);
          });
        });
      } else {
        fn(null, user);
      }
    });
  };

  var CantasRemoteUserStrategy = new RemoteUserStrategy({}, function(token, done) {
    // asynchronous validation, for effect...
    process.nextTick(function() {
      // Find the user by token.  If there is no user with the given token, set
      // the user to `false` to indicate failure.  Otherwise, return the
      // authenticated `user`.
      findByToken(token, function(err, user) {
        if (err) { return done(err); }
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
    });
  });

  var CantasGoogleStrategy;
  if (settings.auth.google && settings.auth.google.clientID && settings.auth.google.clientSecret) {
    CantasGoogleStrategy = new GoogleStrategy({
      clientID: settings.auth.google.clientID,
      clientSecret: settings.auth.google.clientSecret,
      callbackURL: settings.auth.google.callbackURL ||
        sites.currentSite() + 'auth/google/callback'
    },
      function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          User.findOne({'email': profile.emails[0].value}, function (err, user) {
            if (err) { return done(err); }
            if (user === null) {
              var newUser = new User({
                username: profile.emails[0].value,
                email: profile.emails[0].value
              });
              newUser.save(function(err, userSaved) {
                return done(null, newUser);
              });
            } else {
              return done(null, user);
            }
          });
        });
      });
  }


  /*
   * To export predefine strategies.
   *
   * The key is as same as each strategy's name. But this is not a necessary
   * rule.
   */

  module.exports = {
    'kerberos': CantasKerberosStrategy,
    'local': CantasLocalUserStrategy,
    'remoteUser': CantasRemoteUserStrategy
  };

  if (CantasGoogleStrategy) {
    module.exports.googleOAuth = CantasGoogleStrategy;
  }

}(module));

