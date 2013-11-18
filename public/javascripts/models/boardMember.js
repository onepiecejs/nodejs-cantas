// Board member Model

(function ($, _, Backbone) {

  "use strict";

  cantas.models.BoardMember = cantas.models.BaseModel.extend({
    // FIXME: user is not correct. Should be boardmemberrelation.
    urlRoot: "user"
  });

  /*
   * Container of member relations.
   */
  cantas.models.BoardMemberCollection = cantas.models.BaseCollection.extend({
    url: "/boardmemberrelation",
    model: cantas.models.BoardMember
  });

}(jQuery, _, Backbone));
