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
     * Fetch the search results for the query
     */
    search: function(q) {
      this.query = q;
      if (q && q.length) {
        this.setTitle(q);
        this.openQuickSearch();
        this.getCards(q);
        this.getBoards(q);
        this.$('.js-full-results').show();
      } else {
        this.setTitle();
        this.getCards(q);
        this.getBoards(q);
        this.$('.js-full-results').hide();
      }
    }

  });


}(jQuery, _, Backbone));