/**
 * Module Action
 *
 * idMemberCreator
 * data
 * type
 * created
 *
 * REF: https://trello.com/docs/api/board/index.html#get-1-boards-board-id-actions
 *
 * [{
 *   "idMemberCreator": "4ee7deffe582acdec80000ac",
 *   "data": {
 *       "card": {
 *           "id": "4eea522c91e31d174600027e",
 *           "name": "Figure out how to read a user's board list"
 *       },
 *       "board": {
 *           "id": "4eea4ffc91e31d1746000046",
 *           "name": "Example Board"
 *       },
 *       "idMember": "4ee7df74e582acdec80000b6"
 *   },
 *   "type": "addMemberToCard",
 *   "created": "2011-12-15T20:01:59.688Z"
 *  ]
 *
 */

(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var ActionSchema;

  ActionSchema = new Schema({
    idMemberCreator: ObjectId,
    data: { type: {}, default: {} },
    type: { type: String },
    created: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Action', ActionSchema);

}(module));
