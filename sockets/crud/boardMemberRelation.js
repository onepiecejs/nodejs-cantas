
(function(module) {

  "use strict";

  var util = require("util");
  var BaseCRUD = require("./base");

  function BoardMemberRelationCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/boardMemberRelation");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(BoardMemberRelationCRUD, BaseCRUD);

  BoardMemberRelationCRUD.prototype._read = function(data, callback) {
    this.modelClass.find(data).populate("userId").exec(callback);
  };

  module.exports = BoardMemberRelationCRUD;

}(module));
