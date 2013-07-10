
(function(module) {

  "use strict";

  var util = require("util");
  var BaseCRUD = require("./base");

  function ChecklistCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/checklist");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(ChecklistCRUD, BaseCRUD);

  module.exports = ChecklistCRUD;

})(module);
