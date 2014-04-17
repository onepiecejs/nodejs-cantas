/**
 * Page view for listing cards
 *  - Used for subscribed cards, my cards, search, etc.
 */
(function ($, _, Backbone) {

  "use strict";

  cantas.views.CardListView = Backbone.View.extend({
    childViews: [],

    events: {},

    template: jade.compile($("#template-card-list-view").text()),
    noResultsTemplate: jade.compile($("#template-card-list-view-no-results").text()),

    initialize: function() {
      this.listenTo(this.collection, 'reset add remove change', this.renderCards.bind(this));
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

      this.renderCards();
      this.renderSidebar();

      return this;
    },


    /**
     * Render this list of cards
     */
    renderCards: function() {
      var $cardContainer = this.$('.card-archive-list').empty();

      // If there are no cards, display a message
      if (_.size(this.collection) < 1) {
        $cardContainer.html(this.noResultsTemplate({
          message: "Could not find any cards!"
        }));
        return this;
      }

      // Render each of the card views
      this.childViews = [];

      this.collection.each(function(card) {
        var cardView = new cantas.views.StaticCardView({
          model: card,
          attributes: {
            index: null
          }
        });

        this.childViews.push(cardView);
        cardView.render().$el.appendTo($cardContainer);
      }.bind(this));
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

      this.$el.append(sidebarView.$el);
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