#!/usr/bin/env node

/*
 * Help script to add an user to database.
 *
 * Usage:
 *
 * ./scripts/addUser.js displayName password
 */

(function(module) {

  'use strict';

  var async = require('async');
  var mongoose = require('mongoose');
  var infra = require('../services/infra');
  var settings = require('../settings');
  var User = require('../models/user');

  var displayName = null, password = null;
  var argv = process.argv;

  if (argv.length < 3) {
    console.log('You have to provide displayName and password.');
    process.exit(1);
  } else {
    displayName = argv[2];
    password = argv[3];
    if (password === undefined) {
      console.log('Miss password');
      process.exit(1);
    }
  }

  infra.connectDB(settings.mongodb);

  process.on('exit', function() {
    mongoose.disconnect(function() {
      // Exit normally without the need to do any operation
    });
  });

  var user = new User({
    displayName: displayName,
    email: displayName.replace(' ', '_') + '@' + settings.realm
  });

  user.save(function(err, savedUser) {
    if (err) {
      console.log(err.message);
      process.exit(1);
    }

    savedUser.setPassword(password, function(result) {
      if (!result) {
        console.error('Failed to add user ', displayName);
      }
      process.exit(0);
    });
  });

}(module));
