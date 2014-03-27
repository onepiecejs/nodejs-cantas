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
      this.listenTo(this.collection, 'change', this.render.bind(this));
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

      var $cardContainer = this.$el.find('.card-archive-list');

      // If there are no cards, display a message
      if ( _.size(this.collection) < 1 ) {
        $cardContainer.html(this.noResultsTemplate({
          message: "Could not find any cards!"
        }));
        return this;
      }

      // Render each of the card views
      var index = 1;
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

      return this;
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