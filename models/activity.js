(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var ActivitySchema = new Schema({
    content: { type: String, required: true },
    creatorId: { type: ObjectId, required: true, ref: 'User', index: true },
    boardId: { type: ObjectId, required: true, ref: 'Board', index: true },
    createdOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Activity', ActivitySchema);

}(module));
