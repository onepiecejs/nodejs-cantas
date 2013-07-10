// visitor model

$(function ($, _, Backbone) {
  "use strict";

  cantas.models.BoardVisitor = cantas.models.BaseModel.extend({
    urlRoot: "user",
  });

  cantas.models.BoardVisitorCollection = cantas.models.BaseCollection.extend({
    url: "/boardvisitor",
    model: cantas.models.BoardVisitor
  });

}(jQuery, _, Backbone));
