//model vote

$(function ($, _, Backbone) {
  "use strict";
  var BaseModel = cantas.models.BaseModel;
  var BaseCollection = cantas.models.BaseCollection;

  cantas.models.Vote = BaseModel.extend({
    urlRoot: 'vote',

    initialize: function () {
      this.on('modelCleanup', this.modelCleanup, this);
      if (!this.noIoBind) {
        this.ioBind('update', this.serverChange, this);
        this.ioBind('delete', this.serverDelete, this);
      }
    },

    serverChange: function (data) {
      this.set(data);
    },

    serverDelete: function (data) {
      if (typeof this.collection === 'object') {
        this.collection.remove(this);
      } else {
        this.trigger('remove', this);
      }
    },

    modelCleanup: function () {
      this.ioUnbindAll();
      return this;
    }

  });

  cantas.models.VoteCollection = BaseCollection.extend({
    model: cantas.models.Vote,
    url: '/vote',

    initialize: function(models, options) {
      _.bindAll(this, "serverCreate");
      if (!this.noIoBind)
        this.ioBind("create", this.socket, this.serverCreate, this);
    }
  });

}(jQuery, _, Backbone));
