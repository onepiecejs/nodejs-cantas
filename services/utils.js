/**
 * Module Utils
 *
 * we hope all useful function can left here, it wll help another buddy can easily share function.
 *
 */

(function(module) {

  "use strict";

  var fs = require("fs");
  var path = require("path");
  var packageInfo = require("../package.json");

  /*
   * Return service principal name according to Kerberos v5 specification
   * Format is service_name/host_name@REALM
   */
  module.exports.build_krb5_service_principal = function(service_name, host_name, realm) {
    return service_name + "/" + host_name + "@" + realm;
  };

  /*
   * Return user's principal name according to Kerberos v5 specification
   * Format is username@REALM
   */
  module.exports.build_krb5_user_principal = function(username, realm) {
    return username + "@" + realm;
  };

  // Taken from https://github.com/mongodb/js-bson/blob/master/lib/bson/objectid.js
  module.exports.checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

  // return version number and git commit hash if possible
  module.exports.get_version = function() {
    var version = 'unknown';
    // get version from package.json
    if (packageInfo.hasOwnProperty('version')) {
      version = packageInfo.version;
    }

    // get git commit hash if possible
    var commit = '';
    try {
      var headFile = path.resolve(__dirname + "/../.git/HEAD");
      if (fs.existsSync(headFile)) {
        var head = fs.readFileSync(headFile, "utf8").trimRight().split(/\s+/);
        if (head.length === 1) {
          // HEAD file content is commit hash
          // dfc66595a9ca4fe44755d8bda17c20b1178bdfb3
          commit = " GIT@" + head[0].substr(0, 7);
        } else {
          // HEAD file content is refs
          // ref: refs/heads/cantas
          var refs = path.resolve(__dirname + "/../.git/" + head[1]);
          if (fs.existsSync(refs)) {
            var hash = fs.readFileSync(refs, "utf8");
            commit = " GIT@" + hash.substr(0, 7);
          }
        }
      }
    } catch (e) {
      console.warn("Warning: can't get git commit hash: ", e);
    }

    return version + commit;
  };

  /*
   * This is a convenient function test two ObjectIDs' equivalent.
   */
  module.exports.idEquivalent = function(id1, id2) {
    return id1.toString() === id2.toString();
  };


  var markdownEscapeChars = ['\\', '`', '*', '_', '{', '}', '[', ']', '(', ')',
                             '#', '+', '-', '.', '!'];

  module.exports.safeMarkdownString = function(s) {
    var result = [], i = 0, ch;
    while ((ch = s[i]) !== undefined) {
      if (markdownEscapeChars.indexOf(ch) >= 0) {
        result.push('\\' + ch);
      } else {
        result.push(ch);
      }
      ++i;
    }
    return result.join('');
  };

  // sanitizing string to compatible url convension
  module.exports.formatForUrl = function(str) {
    return str.replace(/_/g, '-')
      .replace(/ /g, '-')
      .replace(/:/g, '-')
      .replace(/\\/g, '-')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9\-]+/g, '')
      .replace(/-{2,}/g, '-')
      .toLowerCase();
  };

  //get filename extension string
  module.exports.getExtension = function(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
  };

}(module));
