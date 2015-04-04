'use strict';

var assert = require('assert');
var async = require('async');
var krb5 = require('node-krb5');
var strategies = require('../../services/auth/strategies');
var User = require('../../models/user');


describe('Test Kerberos strategy', function() {

  var krb5_authenticate = null;
  var username = 'cqi';
  var password = 'It is secret.';

  var user1 = null;

  beforeEach(function(done) {
    krb5_authenticate = krb5.authenticate;

    /*
     * Mock krb5.authenticate to make it always success
     */
    krb5.authenticate = function(principal, password, callback) {
      callback(null);
    };

    user1 = new User({username: 'user1', email: 'user1@example.com'});
    user1.save(function(err, savedUser) {
      done();
    });
  });

  afterEach(function(done) {
    krb5.authenticate = krb5_authenticate;

    async.parallel([
      function(callback) {
        User.findOneAndRemove({username: username}, function(err, removedUser) {
          if (err) callback(err, null);
          else callback(null, true);
        });
      },
      function(callback) {
        User.findOneAndRemove({username: user1.username}, function(err, removedUser) {
          if (err) callback(err, null);
          else callback(null, true);
        });
      }
    ],
    function(err, results) {
      if (err) throw err;
      done();
    });
  });

  it('Authenticate with Kerberos credential.', function(done) {
    strategies.kerberos._verify(username, password, function(err, user, info) {
      if (err) throw err;

      User.findOne({username: username}, 'username password', function(err, foundUser) {
        assert.strictEqual(foundUser.username, username);
        assert(foundUser.password.length > 0);
        done();
      });
    });
  });

  it('Do not create user account for an existent Kerberos credential.', function(done) {
    // Here, it doesn't matter what password is.
    var _password = 'xxx';

    strategies.kerberos._verify(user1.username, _password, function(err, user, info) {
      if (err) throw err;

      User.find({username: user1.username}, 'username password', function(err, users) {
        assert.strictEqual(users.length, 1);

        var foundUser = users[0];
        assert.strictEqual(foundUser.username, user1.username);
        assert.strictEqual(foundUser.password, '');

        done();
      });
    });
  });

});
