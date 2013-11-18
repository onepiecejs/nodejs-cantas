//model list

(function ($, _, Backbone) {
  "use strict";

  cantas.models.List = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    noIoBind: false,
    socket: cantas.socket,
    url: function () {
      return "/list" + ((this.id) ? '/' + this.id : '');
    },

    initialize: function () {
      if (!this.noIoBind) {
        this.ioBind('update', this.serverChange, this);
        this.ioBind('delete', this.serverDelete, this);
      }

      // Attach card collections
      this.cardCollection = new cantas.models.CardCollection();
    },

    dispose: function() {
      this.off();
      this.cardCollection.off();
      if (!this.noIoBind) {
        this.ioUnbindAll();
        this.cardCollection.dispose();
      }

      return this;
    },

    validate: function(attrs, options) {
      if (attrs.title === undefined || attrs.length === 0) {
        return "You must enter a title for list.";
      }
      if (/^\s+$/.test(attrs.title)) {
        return "Please enter a effective title for list.";
      }
    },

    // Remove the List and delete its view.
    clear: function (options) {
      this.destroy(options);
      this.modelCleanup();
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
  cantas.models.ListCollection = Backbone.Collection.extend({
    model: cantas.models.List,
    socket: cantas.socket,

    url: "/list",

    initialize: function () {
      _.bindAll(this, 'serverCreate', 'serverMove');
      if (!this.noIoBind) {
        this.ioBind('create', this.socket, this.serverCreate, this);
        this.ioBind('move', this.socket, this.serverMove, this);
      }
    },

    dispose: function() {
      this.forEach(function(item) {
        item.dispose();
      });
      this.off();
      if (!this.noIoBind) {
        this.ioUnbindAll();
      }
      return this;
    },

    serverMove: function(data) {
      if (data) {
        var listCollection = cantas.utils.getCurrentBoardModel().listCollection;
        var list = listCollection.get(data._id);
        if (typeof list === 'undefined') {
          listCollection.add(data);
          list = listCollection.get(data._id);
          list.trigger("change:order", list);
        }
      }
    },

    serverCreate: function (data) {
      if (data) {
        var listCollection = cantas.utils.getCurrentBoardModel().listCollection;
        var list = listCollection.get(data._id);
        if (typeof list === 'undefined') {
          listCollection.add(data);
          list = listCollection.get(data._id);
        }
        list.trigger("change:order", list);
      }
    },

    collectionCleanup: function (callback) {
      this.ioUnbindAll();
      this.each(function (model) {
        model.modelCleanup();
      });
      return this;
    },

    status: function () {
      return this.filter(function (obj) { return obj.get('status'); });
    },

    // next order calculate methods.
    nextOrder: function () {
      if (!this.length) { return 1; }
      var last = _.max(this.pluck('order'), function(order) {
          return order;
        });
      return last + 1;
    },

    comparator: function (obj) {
      return obj.get('order');
    }
  });

}(jQuery, _, Backbone));
