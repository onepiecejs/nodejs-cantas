(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var NotificationSchema;

  NotificationSchema = new Schema({
    userId: { type: ObjectId, required: true, index: true},
    message: { type: String, required: true },
    type: { type: String, required: true },    // values: subscription, invitation, mentioned
    isUnread: {type: Boolean, default: true},
    created: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Notification', NotificationSchema);

}(module));

