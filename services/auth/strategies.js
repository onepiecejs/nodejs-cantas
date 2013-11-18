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
  var settings = require('../../settings');
  var User = require('../../models/user');
  var utils = require('../utils');

  var CantasKerberosStrategy = new LocalStrategy(function(username, password, done) {
    // asynchronous verification, for performance concern.
    process.nextTick(function() {
      // IMPORTANT! NEVER store or log password here. It violates infosec policy!
      var principal = utils.build_krb5_user_principal(username, settings.realm);
      krb5.authenticate(principal, password, function (err) {
        if (err) {
          done(null, false, {message: 'Kerberos auth failed: ' + username});
        } else {
          User.findOne({username: username}, function (err, user) {
            if (user === null) {
              // A new user
              var newUser = new User({
                username: username,
                email: username + '@' + settings.realm.toLowerCase()
              });
              newUser.save(function(err, userSaved) {
                done(null, newUser);
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
        newUser.save(function (err) {
          fn(null, newUser);
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

  if (process.env.NODE_ENV === 'development') {
    /*
     * Dummy strategy for development only.
     *
     * This strategy would create a dummy user account in database. And this
     * account should be appear in production database.
     */
    var DummyStrategy = require('passport-dummy').Strategy;
    var CantasDummyStrategy = new DummyStrategy(function(done) {
      User.findOne({username: 'dummy'}, function(err, user) {
        if (err) {
          done(err);
          return;
        }
        if (user === null) {
          var dummyUser = new User({username: 'dummy', email: 'dummy@example.com'});
          dummyUser.save(function(err, user) {
            if (err) {
              done(err);
            } else {
              done(null, user);
            }
          });
        } else {
          done(null, user);
        }
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
    // defualt we need comments CantasDummyStrategy
    // 'dummy': CantasDummyStrategy,
    'kerberos': CantasKerberosStrategy,
    'remote': CantasRemoteUserStrategy
  };

}(module));

