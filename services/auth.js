
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = require('../models/user');
var krb5 = require('node-krb5');
var utils = require('./utils');
var settings = require('../settings');
var RemoteUserStrategy = require('./remoteUserStrategy');

function findUserById(id, fn) {
  var ObjectId = mongoose.Types.ObjectId;
  User.findById({ _id: new ObjectId(id) }, function (err, user) {
    if (err) {
      fn(new Error('User ' + id + ' does not exist'));
    }
    if ( user == null ) {
      fn(new Error('User ' + id + ' does not exist'));
    } else {
      fn(null, user);
    }
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

// Use the LocalStrategy within Passport.
// Strategies in passport require a `verify` function, which accept
// credentials (in this case, a username and password), and invoke a callback
// with a user object.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for performance concern.
    process.nextTick(function () {
      // IMPORTANT! NEVER store or log password here. It violates infosec policy!
      // bypass kerberos for opensource demo
      // var principal = utils.build_krb5_user_principal(username, settings.realm);
      // krb5.authenticate(principal, password, function (err) {
        // if (err) {
          // return done(null, false, { message: 'Kerberos auth failed: ' + username });
        // } else {
          User.findOne({username: username}, function (err, user) {
            if (user == null) {
              // A new user
              var newUser = new User({
                username: username,
                email: username + '@' + settings.realm.toLowerCase()
              });
              newUser.save(function (err, userSaved) {
                return done(null,newUser);
              });
            } else {
              return done(null, user);
            }
          });
        // }
      // });

    });
  })
);


/**
 * REMOTE_USER strategy use
 */
function findByToken(token, fn) {
  var username = token.split('@')[0];
  User.findOne({username: username}, function (err, user) {
    if (err) {
      fn(new Error('User ' + id + ' does not exist'));
    }

    if (user == null) {
      // A new user
      var newUser = new User({
        username: username,
          email: username + '@' + settings.realm.toLowerCase()
      });
      newUser.save(function (err) {
        fn(null,newUser);
      });
    } else {
      fn(null, user);
    }
  });
}

// Use the RemoteUserStrategy within Passport.
//   Strategies in Passport require a `validate` function, which accept
//   credentials (in this case, a token), and invoke a callback with a user
//   object.
passport.use(new RemoteUserStrategy({},function(token, done) {

  // asynchronous validation, for effect...
  process.nextTick(function () {

    // Find the user by token.  If there is no user with the given token, set
    // the user to `false` to indicate failure.  Otherwise, return the
    // authenticated `user`. 
    findByToken(token, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      return done(null, user);
    });
  });
})
);
 
module.exports = passport;
