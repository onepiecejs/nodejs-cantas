(function(module) {

  "use strict";

  var mongoose = require("mongoose");
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var ChecklistItemSchema = new Schema({
    content: {type: String, required: true},
    checked: {type: Boolean, default: false},
    order: {type: Number, default: 1},
    checklistId: {type: ObjectId, required: true, ref: "Checklist", index: true},
    cardId: {type: ObjectId, required: true, ref: "Card", index: true},
    authorId: {type: ObjectId, required: true, ref: "User", index: true},
    createdOn: {type: Date, default: Date.now},
    updatedOn: {type: Date, default: Date.now}
  });

  ChecklistItemSchema.static.getById = function(id, callback) {
    this.findById({_id: id}).populate("checklistId", "authorId").exec(callback);
  };

  module.exports = mongoose.model("ChecklistItem", ChecklistItemSchema);

}(module));
