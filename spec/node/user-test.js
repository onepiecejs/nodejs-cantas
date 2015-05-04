'use strict';

// Initialize database connection
var dbinit = require('./dbinit');

var assert = require('assert');
var User = require('../../models/user');


describe('Test User.exists', function() {

  var displayName = 'test user1';
  var email = 'test_user1@example.com';
  var user = null;

  beforeEach(function(done) {
    user = new User({displayName: displayName, email: email});
    user.save(function(err, savedUser) {
      done();
    });
  });

  afterEach(function(done) {
    User.findOneAndRemove({email: email}, function() {
      done();
    });
  });

  it('to see whether an existent user exists', function(done) {
    User.exists(email, function(exists) {
      assert(exists, 'User ' + email + ' should exist, but failed.');
      done();
    });
  });

  it('to see whether a non-existent user exists', function(done) {
    var nonexistent_email = 'unknown@example.com';
    User.exists(nonexistent_email, function(exists) {
      assert(exists === false, 'User ' + email + ' does not exists, but failed.');
      done();
    });
  });
});

describe('Test operations against User\'s password', function() {

  var user = null;
  var password = 'it is a secret ;)';

  beforeEach(function(done) {
    user = new User({displayName: 'cqi', email: 'cqi@example.com'});
    user.save(function(err, savedUser) {
      if (err) throw err;
      done();
    });
  });

  afterEach(function(done) {
    user.remove(function(err, removedObject) {
      done();
    });
  });

  it('Set a password', function(done) {
    user.setPassword(password, function(result) {
      assert(result);
      User.findById(user._id, 'password', function(err, foundUser) {
        assert.notEqual(foundUser.password, '');
        done();
      });
    });
  });

  it('Set an empty password', function() {
    assert.throws(function() { user.setPassword(''); }, Error);
    assert.throws(function() { user.setPassword(undefined); }, Error);
    assert.throws(function() { user.setPassword(null); }, Error);
  });

  it('Set an unusable password', function(done) {
    user.setUnusablePassword(function(result) {
      assert(result);
      User.findById(user._id, 'password', function(err, foundUser) {
        assert.notEqual(foundUser.password, '');
        done();
      });
    });
  });

  it('Check user\'s password', function(done) {
    user.setPassword(password, function(result) {
      User.findById(user._id, 'password', function(err, foundUser) {
        user.checkPassword(password, function(result) {
          assert(result);
          done();
        });
      });
    });
  });

});
