/**
 * Layout for the dashboard
 */
(function ($, _, Backbone) {
  "use strict";

  cantas.views.DashboardView = Backbone.View.extend({
    el: '.content',

    events: {},

    contentView: null,
    navigationView: null,

    template: jade.compile($("#template-dashboard-layout-view").text()),

    initialize: function() {
      _.bindAll(this, 'setContentView', 'setNavigationView');
    },

    render: function(context) {
      this.$el.html(this.template());
      this.renderChildViews();
      return this;
    },

    /**
     * Set the active view for the main content area
     * 
     * @param  {View}    view 
     * @return {object}  this
     */
    setContentView: function(view) {
      this.contentView = view;
      return this;
    },

    /**
     * Set the active view for the navigation
     * 
     * @param  {View}    view 
     * @return {object}  this
     */
    setNavigationView: function(view) {
      this.navigationView = view;
      return this;
    },

    /**
     * Render the navigation and content if set
     * 
     * @return {object}
     */
    renderChildViews: function() {
      if (this.navigationView) {
        this.$el.find('.dashboard-navigation').append(this.navigationView.$el);
      }
      if (this.contentView) {
        this.$el.find('.dashboard-content').append(this.contentView.$el);
      }
      return this;
    },


    close: function() {
      if (this.contentView) {
        this.contentView.close();
      }

      if (this.navigationView) {
        this.navigationView.close();
      }

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

