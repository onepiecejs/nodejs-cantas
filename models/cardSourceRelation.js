(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  /*
   * CardSourceRelation schema is designed to record the relationship
   * between card and external source like bug id from bugzilla,
   * issue id from jira.
   */

  var CardSourceRelationSchema = new Schema({
    syncConfigId: { type: ObjectId, required: true, ref: 'SyncConfig', index: true },
    cardId: { type: ObjectId, required: true, ref: 'Card', index: true },
    // External source id like bug id from bugzilla, issue id from jira
    sourceId: { type: String, require: true },

    // External system name
    sourceType: { type: String, require: true },
    lastSyncTime: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('CardSourceRelation', CardSourceRelationSchema);

}(module));
