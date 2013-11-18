(function ($, _, Backbone) {

  "use strict";

  cantas.models.Checklist = cantas.models.BaseModel.extend({
    urlRoot: "checklist",

    initialize: function (attributes, options) {
      this.itemCollection = new cantas.models.ChecklistItemCollection([], {
        container: this
      });

      var parent = cantas.models.BaseModel;
      parent.prototype.initialize.apply(this, arguments);
    },

    /*
     * Remove all event listeners from checklist and the collection of items.
     */
    dispose: function() {
      if (this.itemCollection) {
        this.itemCollection.dispose();
      }
      this.itemCollection = null;

      var parent = cantas.models.BaseModel;
      parent.prototype.dispose.apply(this, arguments);
    }

  });

  cantas.models.ChecklistCollection = cantas.models.BaseCollection.extend({
    url: "/checklist",
    model: cantas.models.Checklist,

    initialize: function(models, options) {
      if (!this.noIoBind) {
        this.ioBind("create", this.socket, this.serverCreate, this);
      }

      var _options = options || {};
      if (_options.card === undefined) {
        throw new Error("Missing card object.");
      }
      this.card = _options.card;
    },

    comparator: function(checklist) {
      return checklist.get("createdOn");
    },

    serverCreate: function(data) {
      if (data.cardId === this.card.id) {
        this.add(data);
      }
    },

    dispose: function() {
      this.card = null;
      if (!this.noIoBind) {
        this.ioUnbindAll();
      }

      var parent = cantas.models.BaseCollection;
      parent.prototype.dispose.apply(this, arguments);
    }
  });

  cantas.models.ChecklistItem = cantas.models.BaseModel.extend({
    urlRoot: "checklistitem"
  });

  cantas.models.ChecklistItemCollection = cantas.models.BaseCollection.extend({
    url: "/checklistitem",
    model: cantas.models.ChecklistItem,

    initialize: function(models, options) {
      if (!this.noIoBind) {
        this.ioBind("create", this.socket, this.serverCreate, this);
      }
      var _options = options || {};
      if (_options.container === undefined) {
        throw new Error("Missing container that ChecklistItem collection must have one.");
      }
      this.container = _options.container;
    },

    serverCreate: function(checklistItem) {
      if (checklistItem.checklistId === this.container.id) {
        this.add(checklistItem);
      }
    },

    comparator: function(item) {
      return item.get("order");
    }

  });

}(jQuery, _, Backbone));
