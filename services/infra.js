(function (module) {

  'use strict';

  var connectRedis = require('connect-redis');
  var mongoose = require('mongoose');
  var redis = require('socket.io/node_modules/redis');

  module.exports.connectDB = function(settings) {
    if (settings.url) {
      mongoose.connect(settings.url);
    } else {
      mongoose.connect(
        settings.host,
        settings.name,
        settings.port,
        {
          user: settings.user,
          pass: settings.pass
        }
      );
    }
  };

  module.exports.connectRedis = function(settings) {
    var redisClients = {
      redisPub: redis.createClient(settings.port, settings.host),
      redisSub: redis.createClient(settings.port, settings.host),
      redisClient: redis.createClient(settings.port, settings.host)
    };

    var password = settings.password;
    if (password) {
      redisClients.redisPub.auth(password);
      redisClients.redisSub.auth(password);
      redisClients.redisClient.auth(password);
    }

    return redisClients;
  };

  /*
   * Create a sesstion store that uses Redis as a storage.
   *
   * express: the express object loaded from express framework.
   * settings: an object containing necessary settings to connect Redis.
   */
  module.exports.createRedisSessionStore = function(express, settings) {
    var RedisSessionStore = connectRedis(express);
    return new RedisSessionStore({
      port: settings.port,
      host: settings.host,
      ttl: settings.ttl,
      pass: settings.password
    });
  };

}(module));