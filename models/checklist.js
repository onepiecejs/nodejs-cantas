(function(module) {

  "use strict";

  var mongoose = require("mongoose");
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;

  var ChecklistSchema = new Schema({
    title: {type: String, default: "New Checklist"},
    cardId: {type: ObjectId, required: true, ref: "Card", index: true},
    authorId: {type: ObjectId, required: true, ref: "User", index: true},
    createdOn: {type: Date, default: Date.now},
    updatedOn: {type: Date, default: Date.now}
  });

  ChecklistSchema.statics.getById = function(id, callback) {
    this.findById({_id: id}).populate("cardId", "authorId").exec(callback);
  };

  module.exports = mongoose.model("Checklist", ChecklistSchema);

}(module));
