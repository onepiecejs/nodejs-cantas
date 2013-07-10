/*
 * Metadatas for arbitraty models
 *
 * Metadata model can be defined here, and export them by adding to the hash
 * assigned to module.exports .
 */
(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;

  var LabelMetadataSchema = new Schema({
    order: {type: Number, required: true, unique: true},
    title: {type: String, default: '' },
    color: {type: String, required: true, unique: true}
  });

  module.exports = {
    LabelMetadata: mongoose.model('LabelMetadata', LabelMetadataSchema)
  };

}(module));
