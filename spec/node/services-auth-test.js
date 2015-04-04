'use strict';

var assert = require('assert');
var utils = require('../../services/auth/utils');


describe('Test password operations', function() {

  it('make password', function() {
    var password = utils.makePassword('admin');
    assert(password.length > 0);
  });

  it('check a password', function() {
    var rawPassword = 'do not tell u';
    var password = utils.makePassword(rawPassword);
    assert(utils.checkPassword('what?', password) === false);
    assert(utils.checkPassword(rawPassword, password) === true);
  });

});
