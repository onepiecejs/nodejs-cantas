(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var VoteSchema = new Schema({
    yesOrNo: { type: Boolean, default: true },
    cardId: { type: ObjectId, required: true, ref: 'Card', index: true },
    authorId: { type: ObjectId, required: true, ref: 'User', index: true },
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Vote', VoteSchema);

}(module));
