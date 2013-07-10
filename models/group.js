(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var GroupSchema;

  GroupSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    created: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Group', GroupSchema);

}(module));

