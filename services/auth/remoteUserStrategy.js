/**
 *  * Module dependencies.
 *   */
var passport = require('passport');
var util = require('util');

/**
 * Strategy` constructor.
 *
 * The HTTP remote_user authentication strategy authenticates requests based on
 * a header token contained in the `remote_user` header field.
 *
 * Examples:
 *
 *     passport.use(new RemoteUserStrategy(
 *       function(token, done) {
 *         User.findByUsername({ username: token }, function (err, user) {
 *           if (err) { return done(err); }
 *           if (!user) { return done(null, false); }
 *           return done(null, user, { scope: 'all' });
 *         });
 *       }
 *     ));
 *  @param {Object} options
 *  @param {Function} verify
 *  @api public
 */

function Strategy(options, verify) {
  if (typeof options === 'function') {
    verify = options;
    options = {};
  }
  if (!verify) {
    throw new Error('HTTP REMOTE_USER authentication strategy requires a verify function');
  }
  passport.Strategy.call(this);
  this.name = 'remote_user';
  this._verify = verify;
  this._realm = options.realm || 'Users';
  if (options.scope) {
    this._scope = (Array.isArray(options.scope)) ? options.scope : [ options.scope ];
  }
  this._passReqToCallback = options.passReqToCallback;
}

/**
 *   Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a HTTP REMOTE_USER authorization
 *   header, body parameter, or query parameter.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req) {

  var token = null;

  if (req.headers && req.headers.remote_user) {
    var remote_user = req.headers.remote_user;
    if (remote_user) {
      token = remote_user;
    } else {
      return this.fail(400);
    }
  } else if (req.session && req.user) {
    token = req.user.username;
  }

  if (!token) {
    return this.fail(this._challenge());
  }

  var self = this;

  function verified(err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(self._challenge('invalid_token')); }
    self.success(user, info);
  }

  if (self._passReqToCallback) {
    this._verify(req, token, verified);
  } else {
    this._verify(token, verified);
  }
};


/**
 * Authentication challenge.
 *
 * @api private
 */

Strategy.prototype._challenge = function (code, desc, uri) {
  var challenge = 'REMOTE_USER realm="' + this._realm + '"';
  if (this._scope) {
    challenge += ', scope="' + this._scope.join(' ') + '"';
  }
  if (code) {
    challenge += ', error="' + code + '"';
  }
  if (desc && desc.length) {
    challenge += ', error_description="' + desc + '"';
  }
  if (uri && uri.length) {
    challenge += ', error_uri="' + uri + '"';
  }

  return challenge;
};

/**
 * Expose `Strategy`.
 */

module.exports = Strategy;

