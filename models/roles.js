(function(module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var RoleSchema;

  RoleSchema = new Schema({
    name: { type: String, required: true },
    perms: [ String ]
  });

  module.exports = mongoose.model('Role', RoleSchema);

}(module));

