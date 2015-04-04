'use strict';

// Initialize database connection
var dbinit = require('./dbinit');

var assert = require('assert');
var User = require('../../models/user');


describe('Test operations against User\'s password', function() {

  var user = null;
  var password = 'it is a secret ;)';

  beforeEach(function(done) {
    user = new User({username: 'cqi', email: 'cqi@example.com'});
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
