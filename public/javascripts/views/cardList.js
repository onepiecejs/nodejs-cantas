/**
 * Page view for listing cards
 *  - Used for subscribed cards, my cards, search, etc.
 */
(function ($, _, Backbone) {

  "use strict";

  /**
   * Card list page view
   */
  cantas.views.CardListView = cantas.views.BaseView.extend({
    childViews: [],

    events: {},

    template: jade.compile($("#template-card-list-view").text()),

    cardCounter: 0,

    initialize: function() {
      this.render();
    },

    /**
     * Render card archive view
     * 
     * @param  {object} context
     * @return {object}
     */
    render: function(context) {
      cantas.setTitle(this.options.title);

      this.$el.html(this.template({
        h3Header: this.options.title
      }));

      this.cardIndex = new cantas.views.CardIndexView({
        el: this.$('.card-archive'),
        collection: this.collection,
        columns: 4,
        paginate: true,
        perPage: 20
      });

      this.renderSidebar();

      return this;
    },

    /**
     * Render the sidebar for displaying filters, etc.
     */
    renderSidebar: function() {
      var sidebarView = new cantas.views.SidebarView().render();
      this.childViews.push(sidebarView);

      // Add card filtering panel
      sidebarView.addPanel(
        new cantas.views.CardFilterPanelView({
          context: sidebarView,
          collection: this.collection
        })
      );

      // Add card sorting panel
      sidebarView.addPanel(
        new cantas.views.CardSortPanelView({
          context: sidebarView,
          collection: this.collection
        })
      );

      this.$el.append(sidebarView.$el);
    },


    close: function() {
      this.cardIndex.close();
      this.remove();
    },


    remove: function() {
      this.undelegateEvents();
      this.$el.empty();
      this.stopListening();
      return this;
    }
  });



  /**
   * Card index view
   *  - Lists all cards in a scrollable view
   *  - Can be used inside any view / page
   */
  cantas.views.CardIndexView = cantas.views.BaseView.extend({

    // Number of columns to put cards in (1, 2, 3 or 4)
    columns: 4,

    childViews: [],

    paginate: false,
    page: 1,
    perPage: 20,

    noResultsTemplate: jade.compile($("#template-card-list-view-no-results").text()),
    loadMoreTemplate: jade.compile($("#template-card-list-load-more").text()),

    events: {
      'click .js-load-more': 'loadMore'
    },

    initialize: function(options) {
      _.bindAll(this, 'renderCard');

      this.columns = options.columns || 4;
      this.paginate = options.paginate || false;
      this.perPage = options.perPage || 20;

      this.listenTo(this.collection, 'add', this.renderCard);
      this.listenTo(this.collection, 'remove', this.removeCard);
      this.listenTo(this.collection, 'reset', this.render);

      this.render();
    },

    render: function() {
      // Make sure we're on the first page
      this.reset();

      var $cardContainer = this.$el.html('<div class="card-container"></div>');

      if (this.columns) {
        $cardContainer.addClass('columns-' + this.columns);
      }

      // Render each of the card views
      this.childViews = [];
      this.$cardContainer = $cardContainer.find('.card-container');
      this.collection.forEach(this.renderCard, this);

      this.renderPagination();

      return this;
    },

    /**
     * Render a single card to the view
     */
    renderCard: function(card) {
      var cardView = new cantas.views.StaticCardView({
        model: card,
        attributes: {
          index: null
        }
      });

      this.childViews.push(cardView);
      cardView.render().$el.appendTo(this.$cardContainer);

      this.renderPagination();
    },

    /**
     * Remove a single card to the view
     */
    removeCard: function(card) {
      _.each(this.childViews, function(cardView) {
        if (card.get('_id') === cardView.model.get('_id')) {
          cardView.close();
        }
      });
    },

    renderPagination: function() {
      if (this.paginate && !this.$('.load-more').length) {
        this.$el.append(this.loadMoreTemplate());
      }

      if (this.paginate && this.collection.size() < this.perPage) {
        this.lastPage();
      }
    },

    /**
     * Load more reults to the view
     */
    loadMore: function() {
      var self = this;
      this.loading(true);

      if (this.collection && this.paginate) {
        this.collection.setPage(++this.page).fetch({
          add: true,
          remove: false,
          success: function(collection, response, options) {
            self.loading(false);

            if (!response || response.length < self.perPage) {
              self.lastPage();
            }
          }
        });
      }
    },

    loading: function(active) {
      if (active) {
        this.$('.load-more').addClass('loading');
      } else {
        this.$('.load-more').removeClass('loading');
      }
    },

    lastPage: function() {
      this.$('.load-more').remove();
    },

    reset: function() {
      this.page = 1;
    },

    close: function() {
      _.each(this.childViews, function(child) {
        child.close();
      });
      this.remove();
    },


    remove: function() {
      this.undelegateEvents();
      this.$el.empty();
      this.stopListening();
      return this;
    }

  });


}(jQuery, _, Backbone));