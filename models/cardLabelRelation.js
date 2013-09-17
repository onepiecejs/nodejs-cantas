(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var CardLabelRelationSchema = new Schema({
    boardId: { type: ObjectId, required: true, ref: 'Board', index: true },
    cardId: { type: ObjectId, required: true, ref: 'Card', index: true },
    labelId: { type: ObjectId, required: true, ref: 'Label', index: true },
    selected: { type: Boolean, default: false},
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('CardLabelRelation',
                                  CardLabelRelationSchema);

}(module));
