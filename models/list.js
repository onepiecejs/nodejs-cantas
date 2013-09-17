(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var Card = require('./card');
  var ListSchema;

  ListSchema = new Schema({
    title: { type: String, required: true },
    isArchived: { type: Boolean, default: false },
    created: { type: Date, default: Date.now },
    creatorId: { type: ObjectId, required: true, index: true },
    order: { type: Number, default: -1},
    boardId: { type: ObjectId, required: true, index: true },
    perms: {
      delete: {
        users: [ ObjectId ],
        roles: [ ObjectId ]
      },
      update: {
        users: [ ObjectId ],
        roles: [ ObjectId ]
      }
    }
  });

  ListSchema.post('remove', function (list) {
    // Also remove its cards.
    Card.remove({listId: list._id}).exec();
  });

  module.exports = mongoose.model('List', ListSchema);

}(module));
