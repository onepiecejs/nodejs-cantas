
"use strict";

var assert = require("assert");
var Mailer = require("../../services/mail");
var SMTPTransport = require("nodemailer/lib/engines/smtp");

describe("Test Mailer interface", function() {

  var mailer = null;
  var response = null;
  var comingEmailMessage = null;

  before(function() {
    mailer = new Mailer();
    response = {};
    comingEmailMessage = null;

    /*
     * Fake method to send mail, its behavior is always correct.
     *
     * I replace the SMTPTransport's sendMail method, if you want its original
     * behavior not changed, SMTPConnectionPool's sendMail method should be
     * replaced.
     */
    SMTPTransport.prototype.sendMail = function(emailMessage, callback) {
      // Instead of sending mail message actually, store it to variable to
      // stimulate the succeed
      comingEmailMessage = emailMessage;
      callback(null, response);
    };
  });

  it("Sending mail to single recipient.", function(done) {
    mailer.sendmail({
      from: "cqi@redhat.com",
      to: "cqi@redhat.com",
      subject: "hello from",
      body: "Hello world."
    }, function(error, response) {
      assert.equal(comingEmailMessage._message.from, "cqi@redhat.com");
    });
    done();
  });

  it("Sending mail to multiple recipients.", function(done) {
    var mailOptions = {
      from: "cqi@redhat.com",
      to: ["cqi@redhat.com", "other@redhat.com"],
      subject: "hello world",
      body: "Hello world."
    };
    mailer.sendmail(mailOptions, function(error, response) {
      assert.equal(comingEmailMessage._message.to, mailOptions.to.join(", "));
    })
    done();
  });

  it("Sending mail from noreply.", function(done) {
    var mailOptions = {
      to: "cqi@redhat.com",
      subject: "hello world",
      body: "Hello world."
    };
    mailer.sendmailFromNoReply(mailOptions, function(error, response) {
      assert.equal(comingEmailMessage._message.from, "noreply@redhat.com");
      assert.equal(comingEmailMessage._message.to, "cqi@redhat.com");
    })
    done();
  });
})
