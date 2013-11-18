#!/usr/bin/node

'use strict';

/*
 * Synchronize users information from OrgChart to Cantas' user database.
 *
 * After this task is done, each Red Hat employee will have a valid user
 * account within Cantas.
 *
 * Usage
 *
 * Initialize Kerberos credential cache with an appropriate principal.
 */

var async = require('async');

/*
 * Module: DB.
 */
(function(module) {
  var mongoose = require('mongoose');
  var settings = require('../settings');

  function DB() {}

  DB.prototype.connect = function() {
    mongoose.connect(
      settings.mongodb.host,
      settings.mongodb.name,
      settings.mongodb.port,
      {
        user: settings.mongodb.user,
        pass: settings.mongodb.pass
      }
    );
  };

  module.exports.DB = new DB();
}(module));

/*
 * Module for ensuring whehther a user exists in Cantas' database already.
 */
(function(module) {

  var User = require('../models/user');

  function StockUsers() {}

  StockUsers.prototype.load = function(callback) {
    var self = this;

    User.find(function(err, users) {
      if (err) {
        throw new Error('Fail to load current Cantas users.');
      }

      var lookup = {};
      var i;
      var n;
      for (i = 0, n = users.length; i < n; i++) {
        var user = users[i];
        lookup[user.username + user.email] = user._id;
      }

      // Remember these users for later looking up.
      self.users = lookup;

      // Notify users have been loaded already.
      callback();
    });
  };

  StockUsers.prototype.exists = function(username, email) {
    return this.users[username + email] !== undefined;
  };

  module.exports.StockUsers = new StockUsers();
}(module));

/*
 * Module: NKerberos.
 *
 * Providing Kerberos methods to support GSSAPI Negotiation mechanism.
 */
(function(module) {

  var gss = require("gss");

  function NKerberos() {}

  NKerberos.prototype.clientInit = function(options) {
    var _options = options || {};
    if (_options.principal === undefined) {
      throw new Error('Missing principal.');
    }
    var creds = gss.acquireCredential(null, 0, [gss.KRB5_MECHANISM], gss.C_INITIATE);
    var zsrName = gss.importName(_options.principal, gss.C_NT_HOSTBASED_SERVICE);
    var context = gss.createInitiator(creds, zsrName, {
      flags: gss.C_MUTUAL_FLAG | gss.C_CONF_FLAG |
             gss.C_INTEG_FLAG | gss.C_REPLAY_FLAG |
             gss.C_SEQUENCE_FLAG,
      mechanism: gss.KRB5_MECHANISM,
    });
    return context;
  };

  NKerberos.prototype.clientStep = function(context, challenge) {
    var _challenge = challenge || null;
    return context.initSecContext(_challenge).toString('base64');
  };

  module.exports.NKerberos = new NKerberos();
}(module));

/*
 * Module: OrgChartSyncTask.
 *
 * Current synchornization rules is mentioned in cantas-dev-list@redhat.com.
 * For convenient reference, I list it here.
 *
 * - We may import all users whose username is the same as the username part of
 *   the email, such as cqi with cqi@redhat.com, ryang with ryang@redhat.com
 * - Ignore all users whose username consists of digits only. I tried to search
 *   a user of such kind of users with email address, OrgChart displayed null
 *   in the web page. It seems this kind of users is treated as invalid ones.
 * - If a user has more than one email address, only the email address is
 *   imported following the rule of the first item above.
 *
 * Q: How to read user information from OrgChart?
 * A: Searching users by user.name. Searching all users whose name starts with
 * alpha letters from a to z. And there are 26 tasks running parallelly
 * controlled by async.map function.
 */
(function(module) {

  var xmlrpc = require("xmlrpc");
  var User = require('../models/user');

  function OrgChartSyncTask(options) {
    this.options = options || {};
    if (this.options.kerberos === undefined) {
      throw new Error('Missing Kerberos options.');
    }
    if (this.options.xmlrpc === undefined) {
      throw new Error('Missing XMLRPC options.');
    }

    this.NKerberos = module.exports.NKerberos;
    this.StockUsers = module.exports.StockUsers;

    this.invalidUsernamePattern = /^\d+$/;
    this.domainName = 'redhat.com';
  }

  OrgChartSyncTask.prototype.parsePrincipal = function(kerberosOptions) {
    var options = kerberosOptions || {};
    if (options.hostname === undefined || options.serviceName === undefined) {
      throw new Error('No enough information to build principal.');
    }

    return options.serviceName + '@' + options.hostname;
  };

  OrgChartSyncTask.prototype.getKrbAuthTicket = function(options) {
    var principal = this.parsePrincipal(options);
    var context = this.NKerberos.clientInit({principal: principal});
    return this.NKerberos.clientStep(context);
  };

  OrgChartSyncTask.prototype.makeEmailAddr = function(username) {
    return username + '@' + this.domainName;
  };

  OrgChartSyncTask.prototype.isUserValid = function(user) {
    var expectedEmail = this.makeEmailAddr(user.name);
    return (!this.invalidUsernamePattern.test(user.name) &&
           user.user_mail !== undefined &&
           user.user_mail.length === 1 &&
           user.user_mail.indexOf(expectedEmail) >= 0);
  };

  /*
   * Core function to synchronize users to Cantas user database.
   */
  OrgChartSyncTask.prototype.syncUsers = function(users, callback) {
    var self = this;
    var namePattern = /^\d+$/;
    var usersToImport = users.filter(function(user) {
      var username = user.name;
      var email = user.user_mail;
      return self.isUserValid(user) &&
             !self.StockUsers.exists(username, email);
    });
    async.map(usersToImport,
      function(user, asyncCallback) {
        var username = user.name;
        var email = username + '@redhat.com';
        var fullname = user.realname;

        var newUser = new User({
          username: username,
          email: email,
          fullname: fullname
        });
        newUser.save(function(err, savedObject) {
          if (err) {
            self.logError(new Error('Fail to import ' + user.name + '. ' + err.message));
            asyncCallback(null, false);
          } else {
            asyncCallback(null, true);
          }
        });
      },
      function(err, results) {
        callback(null,
          results.reduce(function(prevValue, curValue) {
            return prevValue && curValue;
          }, true));
      });
  };

  /*
   * Log error in syslog and terminate synchronization task.
   */
  OrgChartSyncTask.prototype.logError = function(err) {
    var now = new Date();
    var utcnow = now.getUTCFullYear() + '-' +
                 now.getUTCMonth()    + '-' +
                 now.getUTCDate()     + ' ' +
                 now.getUTCHours()    + ':' +
                 now.getUTCMinutes()  + ':' +
                 now.getUTCSeconds();

    console.log(['syncUsers', utcnow, err.message].join(':'));
  };

  /*
   * Due to HTTPS is used by default, create secure client here.
   */
  OrgChartSyncTask.prototype.createXmlrpcClient = function(options) {
    return xmlrpc.createSecureClient(options);
  };

  /*
   * TODO: To provide more statistics about the synchronization.
   */
  OrgChartSyncTask.prototype.handleSyncResult = function(options) {
    var results = options.results;

    var ifTotalDone = results.reduce(function(prevValue, curValue) {
      return prevValue && curValue;
    });
    if (ifTotalDone) {
      this.logError(new Error('All users are imported.'));
    } else {
      this.logError(new Error('Not all users are imported.'));
    }

    // The only and last exit.
    process.exit();
  };

  OrgChartSyncTask.prototype.taskSyncUsers = function(options, asyncCallback) {
    var methodName = 'OrgChart.searchUsers';
    var context = options.context;
    var pattern = options.pattern;
    var xmlrpcClient = options.xmlrpcClient;

    if (pattern === undefined || xmlrpcClient === undefined) {
      throw new Error('No enough information to get users.');
    }

    xmlrpcClient.methodCall(methodName, pattern, function (err, users) {
      if (err) {
        context.logError(err);
      } else {
        context.syncUsers(users, asyncCallback);
      }
    });
  };

  /*
   * Prepare data for synchronization task.
   * For current purpose, task data is the patterns to search users. Format of
   * pattern follows OrgChart's XMLRPC specification.
   *
   * This function can be modified to customize the behavior of providing task
   * data.
   */
  OrgChartSyncTask.prototype.getTaskData = function() {
    var result = [];
    var letters = 'abcdefghijklmnopqrstuvwxyz';
    var i;
    var n;
    for (i = 0, n = letters.length; i < n; i++) {
      result.push([{name: {operator: 'LIKE', value: letters[i] + '%'}}]);
    }

    return result;
  };

  OrgChartSyncTask.prototype.runTasks = function(taskData) {
    var self = this;
    var _options = self.options.xmlrpc;

    var ticket = this.getKrbAuthTicket(self.options.kerberos);
    _options.headers = {'Authorization': 'Negotiate ' + ticket};
    var xmlrpcClient = this.createXmlrpcClient(_options);

    /*
     * Prepare async task data, it has to contain xmlrpc client.
     *
     * options.context saves current object, because async executes task
     * function in a different context.
     */
    var asyncTaskData = [];
    var i;
    var n;
    for (i = 0, n = taskData.length; i < n; i++) {
      asyncTaskData.push({
        context: self,
        xmlrpcClient: xmlrpcClient,
        pattern: taskData[i]
      });
    }

    async.map(asyncTaskData, self.taskSyncUsers, function(err, results) {
      if (err) {
        self.logError(err);
      } else {
        self.handleSyncResult({asyncTaskData: asyncTaskData, results: results});
      }
    });
  };

  /*
   * The entry point to start task.
   */
  OrgChartSyncTask.prototype.run = function() {
    var taskData = this.getTaskData();
    this.runTasks(taskData);
  };

  module.exports.OrgChartSyncTask = OrgChartSyncTask;

  module.exports.syncUsers = {
    start: function(options) {
      var task = new module.exports.OrgChartSyncTask(options);
      task.run();
    }
  };
}(module));

var runDirectlyFromNode = require.main === module;
if (runDirectlyFromNode) {
  var DB = module.exports.DB;
  var StockUsers = module.exports.StockUsers;
  var syncUsers = module.exports.syncUsers;

  var orgchartHostname = process.argv[2];
  if (orgchartHostname === undefined) {
    throw new Error('Missing argument providing the hostname of OrgChart service.');
  }

  DB.connect();
  StockUsers.load(function() {
    syncUsers.start({
      kerberos: {
        hostname: orgchartHostname,
        serviceName: 'HTTP'
      },
      xmlrpc: {
        host: orgchartHostname,
        path: '/orgchart-xmlrpc',
        rejectUnauthorized: false
      }
    });
  });
}
