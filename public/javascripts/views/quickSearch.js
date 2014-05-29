(function ($, _, Backbone) {

  "use strict";

  cantas.views.QuickSearchView = cantas.views.SearchBaseView.extend({

    /**
     * How many cards/boards should be fetched?
     */
    maxCards: 3,
    maxBoards: 4,

    cardListColumns: 3,

    template: jade.compile($("#template-quick-search-view").text()),

    events: {
      'click .js-view-board': 'openBoard',
      'click .card': 'closeQuickSearch',
      'click': function(e) {
        e.stopPropagation();
      },
      'click .js-full-results': 'fullResults'
    },

    initialize: function() {
      _.bindAll(this, 'keyupAction', 'openQuickSearch', 'closeQuickSearch', 'fullResults');
      cantas.views.SearchBaseView.prototype.initialize.call(this);
    },

    /**
     * Allow user to press esc to close quick search
     * Pressing enter goes to full search results
     */
    keyupAction: function(e) {
      var code = e.keyCode || e.which;
      if (code === 27) {
        this.closeQuickSearch();
      }
      if (code === 13) {
        this.fullResults(e);
      }
    },


    /**
     * Opens the search results page
     */
    fullResults: function(e) {
      e.preventDefault();
      cantas.navigateTo('search/' + this.query);
      this.closeQuickSearch();
    },


    setTitle: function(q) {
      if (q) {
        this.$('h3').html('Search results for "' + q + '"');
      } else {
        this.$('h3').html('Search Results');
      }
    },


    /**
     * Open the quick search results panel
     */
    openQuickSearch: function() {
      if (!this.isSearching) {
        this.isSearching = true;
        this.$el.addClass('active');
        $('.content').addClass('muted');
        $('body').on('keyup.quickSearch', this.keyupAction);
        $('body').on('click.quickSearch', this.closeQuickSearch);
      }
    },


    /**
     * Close the quick search panel
     */
    closeQuickSearch: function() {
      if (!this.isSearching) {
        return;
      }

      this.isSearching = false;
      this.$el.removeClass('active');
      $('.content').removeClass('muted');
      $('input.quick-search').blur();
      $('body').off('click.quickSearch');
      $('body').off('keyup.quickSearch');
    },


    /**
     * Display the total number of card results (e.g. 3/120)
     */
    renderCardCount: function(q) {
      var self = this;
      this.cardCollection.fetchTotal(q).then(function(count) {
        var displayed = (count < self.maxCards) ? count : self.maxCards;
        self.$('.cards-title .count').text(displayed + '/' + count);
      });
    },


    /**
     * Display the total number of matching boards
     */
    renderBoardCount: function(q) {
      var self = this;
      this.boardCollection.fetchTotal(q).then(function(count) {
        var displayed = (count < self.maxBoards) ? count : self.maxBoards;
        self.$('.boards-title .count').text(displayed + '/' + count);
      });
    },


    /**
     * Fetch the search results for the query
     */
    search: _.debounce(function(q) {
      this.query = q;
      var self = this;

      if (q && q.length) {
        this.$('.no-results').hide();
        this.$('.results-container').show();
        this.setTitle(q);
        this.openQuickSearch();
        this.getCards(q).then(function() {
          self.renderCardCount(q);
        });
        this.getBoards(q).then(function() {
          self.renderBoardCount(q);
        });
        this.$('.js-full-results').show();
      } else {
        this.$('.no-results').show();
        this.$('.results-container').hide();
        this.$('.js-full-results').hide();
        this.setTitle();
      }
    }, 50)

  });


}(jQuery, _, Backbone));