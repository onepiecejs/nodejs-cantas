'use strict';

var RedisStore = require('socket.io/lib/stores/redis');
var express = require('express');
var mongoose = require('mongoose');
var passport = require('./services/auth');
var app = express.createServer();
var infra = require('./services/infra');
var settings = require('./settings');
var utils = require('./services/utils');

// Ignore validate SSL CA at global scope
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

infra.connectDB(settings.mongodb);
var redisClients = infra.connectRedis(settings.redis);
var sessionStore = infra.createRedisSessionStore(express, settings.redis);

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser('keyboard cat'));
  app.use(express.session({
    secret: 'keyboard cat',
    key: 'express.sid',
    store: sessionStore
  }));
  app.use(express.bodyParser({uploadDir: __dirname + '/uploads'}));
  app.use(express.methodOverride());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.set("production", false);
});

app.configure('production', function() {
  app.use(express.errorHandler());
  app.set("production", true);
});

app.helpers({
  links: settings.links,
  version: utils.get_version(),
  siteId: (settings.piwik.enable && settings.piwik.siteId) || 0,
  siteUrl: (settings.piwik.enable && settings.piwik.siteUrl) || '',
  piwikEnable: settings.piwik.enable
});

app.listen(settings.app.port, settings.app.host, function() {
  //FIXME keep it here,when i understand the concept, i can remove it totally
  // if (app.settings.production) {
    // We have to limit node to run under non-privilege user account
    // to ensure security in production environment.
    // User with name ``username`` should exist at this time.
    // process.setuid(settings.management.service.username);
  // }
});

require('./routes').init(app, passport, sessionStore);

var sio = require('socket.io').listen(app);
sio.configure(function () {
  // Set store for socket.io to use RedisStore instead of MemoryStore
  sio.set('store', new RedisStore(redisClients));
  // enable debugging mode:
  // https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
  // 0 - error
  // 1 - warn
  // 2 - info
  // 3 - debug
  if (app.settings.production) {
    sio.set('log level', 0);
  } else {
    sio.set('log level', 3);
  }
  sio.set('transports', [
    'websocket',
    'xhr-polling'
  ]);
});

require('./sockets').init(sio, sessionStore);

console.log("Express server listening on port %s", settings.app.port);
