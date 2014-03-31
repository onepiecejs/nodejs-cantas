(function ($, _, Backbone) {

  "use strict";

  cantas.models.Card = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    noIoBind: false,
    socket: cantas.socket,
    url: function () {
      return "/card" + ((this.id) ? '/' + this.id : '');
    },

    initialize: function (attributes, options) {
      this.commentCollection = new cantas.models.CommentCollection();
      this.attachmentCollection = new cantas.models.AttachmentCollection();

      if (!this.noIoBind) {
        this.ioBind('update', this.serverChange, this);
        this.ioBind('delete', this.serverDelete, this);
      }
    },

    dispose: function() {
      this.off();
      this.commentCollection.off();
      this.attachmentCollection.off();
      if (!this.noIoBind) {
        this.ioUnbindAll();
        this.commentCollection.dispose();
        this.attachmentCollection.dispose();
      }
      return this;
    },

    // Remove this Card and delete its view.
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
    },

    //card reorder function
    moveToList: function(fromListView, newPosition, cardView) {
      var that = this;
      var inListView = this.inListView;

      // check if move in one list.
      if (typeof inListView === 'undefined') {
        inListView = fromListView;
      }

      //reorder rule
      // var cardCollection = inListView.model.cardCollection;
      var activeCardArray = inListView.model.cardCollection.where({isArchived: false});
      activeCardArray = _.map(activeCardArray, function(card) {
        return card.get('order');
      });
      activeCardArray = activeCardArray.sort(function (a, b) {return a - b; });

      var cardCount = activeCardArray.length;
      var cardOrder = -1;
      var firstIndex, lastIndex, beforeIndex, afterIndex;
      //card moving cards to new list
      //case1: move to empty list
      if (inListView !== fromListView && cardCount === 0 &&
          typeof activeCardArray[newPosition] === 'undefined' &&
          typeof activeCardArray[newPosition + 1] === 'undefined') {
        cardOrder = cardOrder + 65536;
      }

      //case2: move to frist index of card array
      if (inListView !== fromListView && cardCount > 0 &&
          typeof activeCardArray[newPosition - 1] === 'undefined' &&
          typeof activeCardArray[newPosition] !== 'undefined') {
        firstIndex = activeCardArray[newPosition];
        cardOrder = firstIndex / 2;
      }

      //case3: move to inPosition of card array
      if (inListView !== fromListView && cardCount > 0 &&
          typeof activeCardArray[newPosition - 1] !== 'undefined' &&
          typeof activeCardArray[newPosition] !== 'undefined') {
        beforeIndex = activeCardArray[newPosition - 1];
        afterIndex = activeCardArray[newPosition];
        cardOrder = (beforeIndex + afterIndex) / 2;
      }

      //case4: move to last index of card array
      if (inListView !== fromListView && cardCount > 0 &&
          typeof activeCardArray[newPosition - 1] !== 'undefined' &&
          typeof activeCardArray[newPosition] === 'undefined') {
        lastIndex = activeCardArray[newPosition - 1];
        cardOrder = lastIndex + 65536;
      }

      //card moving cards in one list
      //case1: move to frist index of card array
      if (inListView === fromListView && cardCount > 0 && newPosition === 0) {
        firstIndex = activeCardArray[newPosition];
        cardOrder = firstIndex / 2;
      }

      //case 2:  moving to inPositions, from top to bottom
      if (inListView === fromListView && cardCount > 0 &&
          typeof activeCardArray[newPosition - 1] !== 'undefined' &&
          typeof activeCardArray[newPosition] !== 'undefined' &&
          typeof activeCardArray[newPosition + 1] !== 'undefined' &&
          that.get('order') < activeCardArray[newPosition]) {
        beforeIndex = activeCardArray[newPosition];
        afterIndex = activeCardArray[newPosition + 1];
        cardOrder = (beforeIndex + afterIndex) / 2;
      }
      //from bottom to top
      if (inListView === fromListView && cardCount > 0 &&
          typeof activeCardArray[newPosition - 1] !== 'undefined' &&
          typeof activeCardArray[newPosition] !== 'undefined' &&
          typeof activeCardArray[newPosition + 1] !== 'undefined' &&
          that.get('order') > activeCardArray[newPosition]) {
        beforeIndex = activeCardArray[newPosition - 1];
        afterIndex = activeCardArray[newPosition];
        cardOrder = (beforeIndex + afterIndex) / 2;
      }

      //case 3,move to last index of card array
      if (inListView === fromListView && cardCount > 0
          && newPosition === activeCardArray.length - 1) {
        lastIndex = activeCardArray[newPosition];
        cardOrder = lastIndex + 65536;
      }

      //update listView's cardCollection
      if (fromListView.model.id !== inListView.model.id) {
        fromListView.model.cardCollection.remove(that, {silent: true});
        inListView.model.cardCollection.add(that, {silent: true});

        //remove cardView from fromListView's cardViewCache
        //add in inListView's cardViewCache
        var cardIdsCache = {};
        _.each(fromListView.cardViewCache, function(cardView) {
          cardIdsCache[cardView.model.id] = cardView.cid;
        });
        var cardViewCid = cardIdsCache[that.id];
        if (cardViewCid) {
          var currentCardView = fromListView.cardViewCache[cardViewCid];
          delete fromListView.cardViewCache[cardViewCid];
          inListView.cardViewCache[cardViewCid] = currentCardView;
        }

        //update card quantity
        fromListView.updateCardQuantity();
        inListView.updateCardQuantity();

        //update cards order number
        fromListView.updateCardsOrderNumber();
        inListView.updateCardsOrderNumber();
      }

      // card moving rule-last trigger model changed event.
      if (cardOrder !== -1) {
        if (inListView === fromListView) {
          that.patch({
            'order': cardOrder,
            original: {order: that.order}
          }, { silent: true });
        }
        if (inListView !== fromListView) {
          that.patch({
            'order': cardOrder,
            'listId': inListView.model.id,
            original: {listId: fromListView.model.id}
          }, { silent: true });
        }
      }
    }
  });


  // Card Collection Filter Model
  // ----------------------------

  cantas.models.CardFilter = Backbone.Model.extend({

    defaults: {
      keyword: null, // Keyword query
      created: true, // Show cards created by user
      subscribed: true, // Show card the user is subscribed to
      assigned: true, // Show cards the user has been assigned to
      dueDate: 'any', // Card due date: 'day', 'week', 'any'
      archived: false, // Show archived cards
      // closed: false // Show closed cards (cannot be done in a single query)
    },

    /**
     * Morph the filters info a query
     * 
     * @return {object}
     */
    morph: function() {
      var morphed = {};

      // Build a regex for a keyword search
      if (_.isString(this.get('keyword')) && this.get('keyword').length) {
        morphed.title = {
          $regex: this.get('keyword'),
          $options: 'gi'
        };
      }

      // The user must have either created, subscribed or archived
      // Otherwise query cards they are assigned to
      // If they have one or more of these it will be an or query
      if (!this.get('created') && !this.get('assigned') && !this.get('subscribed')) {
        morphed.$or = [
          { creatorId: cantas.user.id },
          { assignees: cantas.user.id },
          { subscribeUserIds: cantas.user.id }
        ];
      } else {
        morphed.$or = [];

        // Filter cards created by the user
        if (this.get('created') === true) {
          morphed.$or.push({
            creatorId: cantas.user.id
          });
        }

        // Filter cards assigned to the user
        if (this.get('assigned') === true) {
          morphed.$or.push({
            assignees: cantas.user.id
          });
        }

        // Filter cards the user has subscribed to
        if (this.get('subscribed') === true) {
          morphed.$or.push({
            subscribeUserIds: cantas.user.id
          });
        }
      }

      // Show cards that are archived
      if (this.get('archived') === false) {
        morphed.isArchived = false;
      }

      // TODO: Filter by due date (needs to be added to the card model first)

      return morphed;
    },

    /**
     * Get the total number of active filters
     * 
     * @return {integer}
     */
    totalActive: function() {
      var total = _.compact(_.toArray(this.toJSON())).length;

      // Any does not count as a filter
      if (this.get('dueDate') === 'any') {
        total--;
      }

      return total;
    }

  });


  // Card Collection
  // ---------------

  cantas.models.CardCollection = Backbone.Collection.extend({
    model: cantas.models.Card,
    socket: cantas.socket,

    // Returns the relative URL where the model's resource would be
    // located on the server. If your models are located somewhere else,
    // override this method with the correct logic. Generates URLs of the
    // form: "/[collection.url]/[id]", falling back to "/[urlRoot]/id" if
    // the model is not part of a collection.
    // Note that url may also be defined as a function.
    url: "/card",

    initialize: function () {

      this.socket.removeAllListeners("/card:create");
      this.socket.removeAllListeners("/card:move");
      this.socket.removeAllListeners("/card:archiveAllCards");

      if (!this.noIoBind) {
        this.ioBind('create', this.socket, this.serverCreate, this);
        this.ioBind('move', this.socket, this.serverMove, this);
        this.ioBind('archiveAllCards', this.socket, this.serverArchiveCards, this);
      }
    },

    dispose: function() {
      this.forEach(function(item) {
        item.dispose();
      });
      this.off();
      return this;
    },

    serverMove: function(data) {
      if (data) {
        var list = cantas.utils.getCurrentBoardModel().listCollection.get(data.listId);
        var cardCollection = list.cardCollection;
        var card = cardCollection.get(data._id);
        if (typeof card === 'undefined') {
          cardCollection.add(data);
          card = cardCollection.get(data._id);
          card.trigger("change:order", card);
        }
      }
    },

    serverArchiveCards: function(data) {
      var listId = data.listId || null;
      var archivedCards = data.archivedCards || null;
      if (archivedCards && listId) {
        var list = cantas.utils.getCurrentBoardModel().listCollection.get(listId);
        var cardCollection = list.cardCollection;
        archivedCards.forEach(function(archivedCard) {
          var card = cardCollection.get(archivedCard._id);
          if (typeof card === 'undefined') {
            cardCollection.add(archivedCard);
            card = cardCollection.get(archivedCard._id);
          }
          card.set(archivedCard);
        });
      }
    },

    serverCreate: function (data) {
      if (data) {
        var list = cantas.utils.getCurrentBoardModel().listCollection.get(data.listId);
        var cards = list.cardCollection;
        var obj = cards.get(data._id);
        if (typeof obj === 'undefined') {
          cards.add(data);
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

    // Filter down the list of all items that are finished.
    status: function () {
      return this.filter(function (card) { return card.get('status'); });
    },

    // Filter down the list to only items that are still not finished.
    nextOrder: function () {
      if (!this.length) { return 1; }
      return this.last().get('order') + 1;
    },

    comparator: function (card) {
      return card.get('order');
    }
  });

}(jQuery, _, Backbone));
