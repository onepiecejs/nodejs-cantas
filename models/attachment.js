(function (module) {

  "use strict";

  var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    AttachmentSchema;

  AttachmentSchema = new Schema({
    cardId: {type: ObjectId, required: true, ref: 'Card', index: true},
    uploaderId: {type: ObjectId, required: true, ref: 'User', index: true},
    name: {type: String, required: true},
    size: {type: Number, required: true},
    // fileType field includes picture, video, audio and other
    fileType: {type: String, default: 'other'},
    path: {type: String, required: true},
    // boolean falg to indicate if this attachment is used as cover for the card  
    isCover: {type: Boolean, default: false},
    // path of the thumbnail which is used in the card view
    cardThumbPath: {type: String, default: ''},
    // path of the thumbnail which is used in the card details view
    cardDetailThumbPath: {type: String, default: ''},
    createdOn: {type: Date, default: Date.now}
  });

  AttachmentSchema.statics.getById = function (id, callback) {
    this.findById({_id: id}).populate("cardId", "uploaderId").exec(callback);
  };

  module.exports = mongoose.model('Attachment', AttachmentSchema);

}(module));
