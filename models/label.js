(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var LabelSchema = new Schema({
    title: { type: String, default: '' },
    order: { type: Number, required: true },
    color: { type: String, required: true },
    boardId: { type: ObjectId, required: true, ref: 'Board', index: true},
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Label', LabelSchema);

}(module));
