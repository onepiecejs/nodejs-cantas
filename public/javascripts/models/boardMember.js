// Board member Model

$(function ($, _, Backbone) {

  "use strict";

  cantas.models.BoardMember = cantas.models.BaseModel.extend({
    urlRoot: "user",

    initialize: function() {
      this.memberCollection = new cantas.models.BoardMemberCollection;
    }
  });

  cantas.models.BoardMemberCollection = cantas.models.BaseCollection.extend({
    url: "/boardmemberrelation",
    model: cantas.models.BoardMember
  });

}(jQuery, _, Backbone));
