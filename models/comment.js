(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var CommentSchema;

  CommentSchema = new Schema({
    content: { type: String, required: true },
    cardId: { type: ObjectId, required: true, ref: 'Card', index: true},
    authorId: { type: ObjectId, required: true, ref: 'User', index: true },
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, required: false }
  });

  module.exports = mongoose.model('Comment', CommentSchema);

}(module));

