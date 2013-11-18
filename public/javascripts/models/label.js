(function ($, _, Backbone) {

  "use strict";

  var BaseModel = cantas.models.BaseModel;
  var BaseCollection = cantas.models.BaseCollection;

  cantas.models.Label = BaseModel.extend({
    urlRoot: 'label'
  });

  cantas.models.LabelCollection = BaseCollection.extend({
    model: cantas.models.Label,
    url: '/label',

    initialize: function(models, options) {
      _.bindAll(this, "serverCreate");
      if (!this.noIoBind) {
        this.ioBind("create", this.socket, this.serverCreate, this);
      }
    }
  });

  cantas.models.CardLabelRelation = BaseModel.extend({
    urlRoot: 'cardlabelrelation'
  });

  cantas.models.CardLabelRelationCollection = BaseCollection.extend({
    model: cantas.models.CardLabelRelation,
    url: 'cardlabelrelation',

    /*
     * Due to the number of labels of a card is fixed, we don't need listen to
     * create event. So, override this function to disable default behavior,
     * and add other possible actions.
     */
    initialize: function(models, options) {
    },

    comparator: function(relation) {
      return relation.get('cardId').order;
    }
  });

}(jQuery, _, Backbone));
