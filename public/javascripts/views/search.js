(function ($, _, Backbone) {

  "use strict";


  /**
   * Base view for search results
   */
  cantas.views.SearchBaseView = cantas.views.BaseView.extend({

    isSearching: false,

    maxCards: -1,
    maxBoards: -1,

    cardListColumns: 4,

    /**
     * Board lists don't have their own view class
     */
    boardListTemplate: jade.compile($("#template-search-board-list-view").text()),

    initialize: function() {
      _.bindAll(this, 'openBoard');

      this.query = null;
      this.cardViews = [];

      this.cardCollection = new cantas.models.CardCollection()
        .setPage(1)
        .setPerPage(this.maxCards)
        .setSort({
          created: -1,
          title: 1
        });

      this.boardCollection = new cantas.models.BoardCollection();
      this.listenTo(this.boardCollection, 'sync reset add remove', this.renderBoardResults);

      this.render();
    },

    render: function() {
      this.$el.html(this.template());
      this.renderCardResults();
    },


    renderCardResults: function() {
      var $cardsContainer = this.$('.card-archive');

      this.cardListView = new cantas.views.CardIndexView({
        el: $cardsContainer,
        collection: this.cardCollection,
        columns: this.cardListColumns,
        paginate: this.paginate || false,
        perPage: this.maxCards
      }).render();
    },


    renderBoardResults: function() {
      var $boardContainer = this.$('.board-archive').empty(),
        results = this.boardCollection.toJSON();

      if (this.maxBoards > 0) {
        results = _.first(results, this.maxBoards);
      }

      $boardContainer.html(this.boardListTemplate({
        boards: results
      }));
    },


    openBoard: function(e) {
      e.preventDefault();
      this.closeQuickSearch();
      cantas.navigateTo($(e.target).attr('href'));
    },


    /**
     * Fetch matching cards
     */
    getCards: function(q) {
      var deferred = $.Deferred();

      this.cardCollection.setFilters({
        $or: [
          { creatorId: cantas.user.id },
          { assignees: cantas.user.id },
          { subscribeUserIds: cantas.user.id }
        ],
        title: {
          $regex: q,
          $options: 'gi'
        }
      }).fetch({
        reset: true,
        success: deferred.resolve
      });

      return deferred.promise();
    },


    /**
     * Fetch matching boards
     */
    getBoards: function(q) {
      var deferred = $.Deferred();

      this.boardCollection.fetch({
        data: {
          $or: [
            { isPublic: true },
            { creatorId: cantas.user.id }
          ],
          title: {
            $regex: q,
            $options: 'gi'
          }
        },
        success: deferred.resolve
      });

      return deferred.promise();
    },

    close: function() {
      this.cardListView.close();
      this.remove();
    },

    remove: function() {
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();
      return this;
    }

  });


  /**
   * Main full page search view
   */
  cantas.views.SearchView = cantas.views.SearchBaseView.extend({

    el: '.content',

    query: null,

    maxCards: 20,
    maxBoards: -1,
    paginate: true,

    template: jade.compile($("#template-search-view").text()),

    search: function(q) {
      this.query = q;
      this.getCards(q);
      this.getBoards(q);
    }

  });


}(jQuery, _, Backbone));