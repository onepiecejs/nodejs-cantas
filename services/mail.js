var nodemailer = require("nodemailer");
var wellknown = require("nodemailer/lib/wellknown");
var settings = require("../settings");

/*
 * Add Zimbra to wellknown mail service so that Nodemailer recognizes it.
 */
wellknown.Zimbra = settings.mailServices.Zimbra;

function mailer() {}

/*
 * Send mail to recipients.
 *
 * All mail options, such as sender, recipients, subject and body, is contained
 * in options argument.
 *
 * Arguments:
 * - options.from: a string, address of sender
 * - options.to: a string or an array, addresses of recipients
 * - options.subject: a string, subject of the mail
 * - options.body: a string, body of mail that recipients can read
 * - options.html: a boolean, indicate whether the body is formatted in HTML
 */
mailer.prototype.sendmail = function(options, callback) {
  var recipients = options.to;
  if (typeof recipients === "object" && recipients.join !== undefined) {
    recipients = recipients.join(", ");
  }
  var mailOptions = {
    from: options.from,
    to: recipients,
    subject: options.subject
  };
  mailOptions[options.html ? "html" : "text"] = options.body;
  var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Zimbra",
  });
  smtpTransport.sendMail(mailOptions, function(error, response) {
    callback(error, response);
  });
};

mailer.prototype.sendmailFromNoReply = function(options, callback) {
  options.from = "noreply@redhat.com";
  this.sendmail(options, callback);
};

module.exports = mailer;
