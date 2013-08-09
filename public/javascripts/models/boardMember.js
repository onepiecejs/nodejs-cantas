// Board member Model

$(function ($, _, Backbone) {

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
    model: cantas.models.BoardMember,

    initialize: function () {
      this.ioBind('create', this.serverCreate, this);
      this.ioBind('update', this.serverUpdate, this);
    },

    serverUpdate: function(relation) {
      var model = this.get(relation._id);
      this.remove(model);
    }
  });

}(jQuery, _, Backbone));
