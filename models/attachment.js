(function (module) {

  "use strict";

  var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    AttachmentSchema;

  AttachmentSchema = new Schema({
    cardId: {type: ObjectId, required:true, ref: 'Card'},
    uploaderId: {type: ObjectId, required:true, ref: 'User'},
    name: {type: String, required: true},
    size: {type: Number, required: true},
    fileType: {type: String, default: ''},
    path: {type: String, required: true},
    createdOn: {type: Date, default: Date.now}
  });

  AttachmentSchema.statics.getById = function (id, callback) {
    this.findById({_id: id}).populate("cardId", "uploaderId").exec(callback);
  };

  module.exports = mongoose.model('Attachment', AttachmentSchema);

}(module));
