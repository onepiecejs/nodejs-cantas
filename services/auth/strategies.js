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

  var LocalStrategy = require('passport-local').Strategy;
  var RemoteUserStrategy = require('./remoteUserStrategy');
  var settings = require('../../settings');
  var User = require('../../models/user');
  var utils = require('../utils');
  var authUtils = require('./utils');
  var sites = require('../sites');

  /*
   * Convenient dummy local strategy only for local development
   *
   * Whatever credential input from login page, this strategy will always treat
   * the user valid and pass the login. If this is the first time to login, a
   * dummy user is created automatically on behalf of developer.
   */
  var CantasDummyStrategy = new LocalStrategy(function(email, password, done) {
    // As the description, argument email and password are not used.
    var _displayName = 'Admin';
    var _email = 'admin@example.com';

    process.nextTick(function() {
      User.findOne({email: _email}, function(err, user) {
        if (err) {
          throw err;
        }

        var dummyUser = user;
        if (dummyUser === null) {
          dummyUser = new User({displayName: _displayName, email: _email});
          dummyUser.save(function(err, savedUser) {
            if (err) {
              throw err;
            }
            done(null, dummyUser);
          });
        } else {
          done(null, dummyUser);
        }
      });
    });
  });
  CantasDummyStrategy.name = 'dummy';

  var CantasKerberosStrategy = new LocalStrategy(function(kerberosName, password, done) {
    // asynchronous verification, for performance concern.
    process.nextTick(function() {
      var krb5 = require('node-krb5');

      // IMPORTANT! NEVER store or log password here. It violates infosec policy!
      var principal = utils.build_krb5_user_principal(kerberosName, settings.realm);
      var email = principal.toLowerCase();

      krb5.authenticate(principal, password, function (err) {
        if (err) {
          done(null, false, {message: 'Invalid Kerberos name or password.'});
        } else {
          authUtils.createUserIfNotExist(kerberosName, email, function(err, user) {
            if (err) {
              done(null, false,
                   {message: 'Login failed. Please check your kerberos name and password'});
            } else {
              done(null, user);
            }
          });
        }
      });
    });
  });
  CantasKerberosStrategy.name = 'kerberos';

  var CantasRemoteUserStrategy = new RemoteUserStrategy({}, function(token, done) {
    // asynchronous validation, for effect...
    process.nextTick(function() {
      // Curious, why token here can be converted to an email? Look like I
      // should inspect the source code from the backend strategy.
      var email = token.toLowerCase();
      var displayName = email.split('@')[0];
      authUtils.createUserIfNotExist(displayName, email, function(err, user) {
        if (err) {
          /*
           * When remote strategy is enabled, user does not talk with Cantas
           * directly to accomplish the authentication, because usually a third
           * party authentication service serving in the front of Cantas within
           * Web server container is responsible for the authentiation. That
           * is, user will interact with Web browser directly, and Cantas does
           * not show any "login page" to gather credential and it treats the
           * user along with HTTP request is a valid one.
           *
           * So, in this use case, if any error occurs here, how to deal with
           * it? It is difficult to tell user something is going wrong in a
           * proper way.
           *
           * TODO: One way is to display a general error page to tell user why
           * login failed, and what next could be done to fix or request help.
           */
          console.error('Login via remote strategy failed.');
          console.error(err);

          done(null, false, {message: 'Authentication cannot complete.'});
        } else {
          done(null, user);
        }
      });
    });
  });

  var CantasGoogleStrategy;
  if (settings.auth.google && settings.auth.google.clientID && settings.auth.google.clientSecret) {
    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

    CantasGoogleStrategy = new GoogleStrategy({
      clientID: settings.auth.google.clientID,
      clientSecret: settings.auth.google.clientSecret,
      callbackURL: settings.auth.google.callbackURL || sites.currentSite() + 'auth/google/callback'
    },
      function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          var email = profile.emails[0].value;
          authUtils.createUserIfNotExist(profile.displayName, email, function(err, user) {
            if (err) {
              done(null, false, {message: 'Failed to login with Google account ' + email});
            } else {
              done(null, user);
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
    'dummy': CantasDummyStrategy,
    'kerberos': CantasKerberosStrategy,
    'remoteUser': CantasRemoteUserStrategy
  };

  if (CantasGoogleStrategy) {
    module.exports.googleOAuth = CantasGoogleStrategy;
  }

}(module));

