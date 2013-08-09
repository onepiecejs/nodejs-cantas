//model attachment

$(function ($, _, Backbone) {
  "use strict";

  cantas.models.Attachment = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    noIoBind: false,
    socket: cantas.socket,
    url: function () {
      return "/attachment" + ((this.id) ? '/' + this.id : '');
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
  cantas.models.AttachmentCollection = Backbone.Collection.extend({
    model: cantas.models.Attachment,
    socket: cantas.socket,

    url: "/attachment",

    initialize: function () {
      this.on('collectionCleanup', this.collectionCleanup, this);
      this.bindCreateEvent(this.socket);
    },

    bindCreateEvent: function(socket) {
      socket.removeAllListeners("/attachment:create");
      socket.on('/attachment:create', this.serverCreate, this);
    },

    serverCreate: function (data) {
      if (data) {
        var card = cantas.utils.getCardModelById(data.cardId);
        if (card){
          card.attachmentCollection.add(data);
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

    // sort attachments by 'createdOn' in ascending order
    comparator: function(a, b) {
      if (a.get('createdOn') > b.get('createdOn')){
        return 1;
      }else if(a.get('createdOn') < b.get('createdOn')){
        return -1;
      }else{
        return 0;
      }
    }

  });

}(jQuery, _, Backbone));
