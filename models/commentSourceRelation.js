(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  /*
   * CommentSourceRelation schema is designed to record comment which
   * is from external system like bug comment from bugzilla.
   */

  var CommentSourceRelationSchema = new Schema({
    commentId: { type: ObjectId, required: true, ref: 'Comment', index: true },
    cardId: { type: ObjectId, required: true, ref: 'Card', index: true },
    sourceId: { type: String, require: true },
    sourceType: { type: String, require: true },
    lastSyncTime: { type: Date, default: Date.now }

  });

  module.exports = mongoose.model('CommentSourceRelation', CommentSourceRelationSchema);

}(module));
