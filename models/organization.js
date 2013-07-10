/**
 * Model: Organization
 *
 * name String
 * description(Optional) String
 *
 */

(function (module) {

  "use strict";

  var mongoose = require('mongoose');
  var Schema = mongoose.Schema;
  var ObjectId = Schema.ObjectId;
  var OrganizationSchema;

  OrganizationSchema = new Schema({
    name: { type: String },
    description: { type: String }
  });

  module.exports = mongoose.model('Organization', OrganizationSchema);

}(module));