
'use strict';

var assert = require('assert');
var utils = require('../../services/utils');


describe('Test generate random string', function() {

  it('get random string', function() {
    var string = utils.randomString();
    assert(string.length > 0);
  });

});
