(function(module) {

  "use strict";

  var requestify = require('requestify');

  var BugzillaAPIMethod = {
    BUG_GET: 'Bug.get',
    BUG_SEARCH: 'Bug.search',
    BUG_COMMENT: 'Bug.comments'
  };

  var BugzillaClient = function (options) {
    options = options || {};
    this.username = options.username;
    this.password = options.password;
    this.apiUrl = options.url || "https://bugzilla.mozilla.org/jsonrpc.cgi";
  };

  var handleResponse = function (response, field, callback) {
    var error = response.getBody().error;
    var json;

    if (response.getCode() >= 300 || response.getCode() < 200) {
      error = "HTTP status " + response.response.getCode();
    } else {
      try {
        json = response.getBody();
      } catch (e) {
        error = "Response wasn't valid json: '" + response.getBody() + "'";
      }
    }
    if (json && json.error) {
      error = json.error.message;
    }

    var ret = null;
    if (!error) {
      ret = field ? json[field] : json;
    }
    callback(error, ret);
  };

  var requestAPI = function(method, requestMethod, params, field, callback, _this) {
    var url = _this.apiUrl;
    if (_this.username && _this.password) {
      params.Bugzilla_login = _this.username;
      params.Bugzilla_password = _this.password;
    }
    if (params) {
      url += '?method=' + method + '&params=[' + JSON.stringify(params) + ']';
    }
    requestify.request(url, {
      method: requestMethod,
      headers: {'Content-type': 'application/json' },
      dataType: 'json'
    })
      .then(function(response) {
        handleResponse(response, field, callback);
      });
  };

  BugzillaClient.prototype = {
    query: function (queryMethod, params, callback) {
      if (!callback) {
        callback = params;
        params = {};
      }
      requestAPI(queryMethod, 'GET', params, 'result', callback, this);
    }
  };

  exports.createClient = function (options) {
    return new BugzillaClient(options);
  };

  exports.queryMethod = BugzillaAPIMethod;

}(module));
