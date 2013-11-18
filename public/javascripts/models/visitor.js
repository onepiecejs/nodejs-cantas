// visitor model

(function ($, _, Backbone) {
  "use strict";

  cantas.models.BoardVisitor = cantas.models.BaseModel.extend({
    urlRoot: "boardvisitor"
  });

  cantas.models.BoardVisitorCollection = cantas.models.BaseCollection.extend({
    url: "/boardvisitor",
    model: cantas.models.BoardVisitor,

    initialize: function() {

      if (!this.noIoBind) {
        this.ioBind("create", this.serverCreate, this);
      }
    }

  });

}(jQuery, _, Backbone));
