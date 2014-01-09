"use strict";

var fs = require("fs");
var path = require("path");

var jade = require("jade");
var markdown = require("markdown").markdown;
var Mailer = require("./mail");
var settings = require("../settings");
var NotifyModel = require("../models/notification");
var NotificationTypes = require("../models/notificationType");

/*
 * send email
 *
 * Arguments:
 *  - from: string, email addr, sender of the email, required
 *  - to:   string, email addr, receiver of the email, required
 *  - subject: string, email subject, required
 *  - body: string or hash, content of email, required
 *  - template: string, template file name
 */
function sendmail(from, to, subject, body, template) {
  if (template) {
    var filename = path.resolve(__dirname + "/../views/email/" + template);
    if (fs.existsSync(filename)) {
      try {
        var content = fs.readFileSync(filename, "utf8");
        var bodyTemplate = jade.compile(content, {filename: filename});
        var context = {};
        if (typeof body === "object") {
          context = body;
        } else {
          context.username = to.split('@')[0];
          context.message = body;
        }
        body = bodyTemplate(context);
      } catch (e) {
        console.error("Error when read template file: " + template + " : ", e);
      }
    }
  }

  var subjectPrefix = settings.notification.subjectPrefix;
  subject = subjectPrefix + subject;

  var mailAgent = new Mailer();
  mailAgent.sendmail({
    from: from,
    to: to,
    subject: subject,
    body: body,
    html: true
  }, function(err, response) {
    if (err) {
      console.error("Error when sending mail: ", err);
    }
  });
}

module.exports.mail = function(socket, to, msg, _type, _options) {
  var type = _type || NotificationTypes.information;
  var options = _options || {};

  if (typeof type === 'object') {
    options = type;
    type = NotificationTypes.information;
  }

  if (!options.from) {
    options.from = socket.handshake.user.email;
  }
  if (!options.to) {
    options.to = to.email;
  }
  if (!options.subject) {
    options.subject = "Notification";
  }
  if (!options.body) {
    options.body = markdown.toHTML(msg);
  }
  if (!options.template) {
    options.template = "notification.jade";
  }

  // send mail
  sendmail(options.from, options.to, options.subject, options.body, options.template);
};

module.exports.types = NotificationTypes;

/*
 * send notification
 *
 * Arguments:
 *  - socket: object, socket instance, required
 *  - to: object, user object who should be notified, required
 *  - msg: string, notification message, required
 *  - type: string, type of notification, optional, default notificationType.information
 *  - options: hash, options for sendmail
 *    - from: string, email addr, sender of the email, default $socket.handshake.user.email
 *    - to:   string, email addr, receiver of the email, default $to.email
 *    - subject: string, email subject, required, default "Notification"
 *    - body: string or hash, content of email, default $msg
 *    - template: string, template file name, default "notification.jade"
 */

module.exports.notify = function(socket, to, msg, _type) {
  if (!socket || !to || !msg) {
    console.error("Error: function 'notify' missing arguments");
    return;
  }

  var type = _type || NotificationTypes.information;

  NotifyModel.create({
    userId: to._id,
    message: msg,
    type: type,
  }, function(err, obj) {
    if (err) {
      console.error(err);
    } else {
      var name = "/notification:create";
      var clients = socket.sio.sockets.clients();
      clients.forEach(function(client) {
        if (client.handshake.user._id.toString() === to._id.toString()) {
          client.emit(name, obj);
        }
      });
    }
  });
};

