//model sync configuraion

(function ($, _, Backbone) {
  "use strict";

  cantas.models.SyncConfig = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    noIoBind: false,
    socket: cantas.socket,
    url: function () {
      return "/syncconfig" + ((this.id) ? '/' + this.id : '');
    },

    initialize: function () {
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
  cantas.models.SyncConfigCollection = cantas.models.BaseCollection.extend({
    model: cantas.models.SyncConfig,
    socket: cantas.socket,

    url: "/syncconfig",

    initialize: function () {
      this.socket.removeAllListeners("/syncconfig:create");
      this.socket.on('/syncconfig:create', this.serverCreate, this);
    },

    serverCreate: function (data) {
      if (data) {
        var board = cantas.utils.getCurrentBoardModel();
        if (board) {
          board.syncConfigCollection.add(data);
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

    // sort configurations by 'createdOn' in ascending order
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
