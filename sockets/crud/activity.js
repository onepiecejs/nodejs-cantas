
(function(module) {

  "use strict";

  var util = require("util");
  var BaseCRUD = require("./base");

  function ActivityCRUD(options) {
    BaseCRUD.call(this, options);

    this.updateEnabled = false;
    this.patchEnabled = false;

    this.modelClass = require("../../models/activity");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(ActivityCRUD, BaseCRUD);

  module.exports = ActivityCRUD;

}(module));
