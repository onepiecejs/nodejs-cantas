(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  /*
   * SyncConfig schema is designed to record the mapping and
   * related settings between list and query url.
   * User can config several mappings in a board
   */

  var SyncConfigSchema = new Schema({
    boardId: { type: ObjectId, required: true, ref: 'Board', index: true },
    listId: { type: ObjectId, ref: 'List', index: true },

    // QueryUrl is used for querying bug/issue info
    // from external system like bugzilla or jira through API
    queryUrl: { type: String },

    // External system name
    queryType: { type: String, required: true },

    // If sync external systems based on sync config automatically
    isActive: { type: Boolean, default: true },

    // Set the interval time when cantas sync external
    // systems automatically, default is 8 hours once
    intervalTime: { type: Number, default: 8 },

    creatorId: { type: ObjectId, required: true, ref: 'User', index: true },
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('SyncConfig', SyncConfigSchema);

}(module));
