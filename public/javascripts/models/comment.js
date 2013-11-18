//model comment

(function ($, _, Backbone) {
  "use strict";

  cantas.models.Comment = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    noIoBind: false,
    socket: cantas.socket,
    url: function () {
      return "/comment" + ((this.id) ? '/' + this.id : '');
    },

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


  //Collection
  cantas.models.CommentCollection = cantas.models.BaseCollection.extend({
    model: cantas.models.Comment,
    socket: cantas.socket,
    url: "/comment",

    initialize: function () {
      this.socket.removeAllListeners("/comment:create");
      this.socket.on('/comment:create', this.serverCreate, this);
    },

    serverCreate: function (data) {
      if (data) {
        var card = cantas.utils.getCardModelById(data.cardId);
        if (card) {
          card.commentCollection.add(data);
        }
      }
    },

    collectionCleanup: function (callback) {
      this.ioUnbindAll();
      this.each(function (model) {
        model.modelCleanup();
      });
      return this;
    },

    // sort comments by 'createdOn' in ascending order
    comparator: function(a, b) {
      if (a.get('createdOn') > b.get('createdOn')) {
        return 1;
      }
      if (a.get('createdOn') < b.get('createdOn')) {
        return -1;
      }
      return 0;
    }

  });

}(jQuery, _, Backbone));
