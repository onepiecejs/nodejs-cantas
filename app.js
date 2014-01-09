var express = require('express');
var mongoose = require('mongoose');
var card = require('./models/card');
var list = require('./models/list');
var board = require('./models/board');
var routes = require('./routes');
var sockets = require('./sockets');
var settings = require('./settings');
var utils = require('./services/utils');
var connect = require('express/node_modules/connect');
var redis = require('socket.io/node_modules/redis');
var RedisStore = require('socket.io/lib/stores/redis');
var RedisSessionStore = require('connect-redis')(express);
var sessionStore = new RedisSessionStore({
    port: settings.redis.port,
    host: settings.redis.host,
    ttl: settings.redis.ttl
  });
var app = express.createServer();
var sio;
var passport = require('./services/auth');
var redisClients = {
    redisPub: redis.createClient(
      settings.redis.port,
      settings.redis.host
    ),
    redisSub: redis.createClient(
      settings.redis.port,
      settings.redis.host
    ),
    redisClient: redis.createClient(
      settings.redis.port,
      settings.redis.host
    )
  };
var siteUrl;
var siteId = 0;

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
  }
    ));
  app.set("production", false);
});

app.configure('production', function() {
  app.use(express.errorHandler());
  app.set("production", true);
});

if (app.settings.production) {
  siteId = settings.piwikSiteId.product;
  siteUrl = settings.piwikSiteId.productUrl;
} else {
  siteId = settings.piwikSiteId.stage;
  siteUrl = settings.piwikSiteId.stageUrl;
}

app.helpers({
  links: settings.links,
  version: utils.get_version(),
  siteId: siteId,
  siteUrl: siteUrl
});

routes.init(app, passport, sessionStore);
mongoose.connect(
  settings.mongodb.host,
  settings.mongodb.name,
  settings.mongodb.port,
  {
    user: settings.mongodb.user,
    pass: settings.mongodb.pass
  }
);

// Ignore validate SSL CA at global scope
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

app.listen(settings.app.port, settings.app.host, function() {
  if (app.settings.production) {
    // We have to limit node to run under non-privilege user account
    // to ensure security in production environment.
    // User with name ``username`` should exist at this time.
    process.setuid(settings.management.service.username);
  }
});

sio = require('socket.io').listen(app);
sockets.init(sio, sessionStore);

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

console.log("Express server listening on port %s", settings.app.port);
