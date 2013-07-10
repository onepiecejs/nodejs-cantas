(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var ActivitySchema = new Schema({
    content: { type: String, required: true },
    creatorId: { type: ObjectId, required: true, ref: 'User' },
    boardId: { type: ObjectId, required: true, ref: 'Board' },
    createdOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Activity', ActivitySchema);

}(module));
