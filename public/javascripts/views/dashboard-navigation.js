/**
 * Layout for the dashboard navigation
 */
(function ($, _, Backbone) {
  "use strict";

  cantas.views.DashboardNavigationView = Backbone.View.extend({
    events: {},

    template: jade.compile($("#template-dashboard-navigation-view").text()),

    initialize: function() {},

    setActive: function(className) {
      this.$el.find('a.active').removeClass('active');
      this.$el.find('a.' + className).parents('li').addClass("active");
      return this;
    },

    render: function(context) {
      this.$el.html(this.template());
      return this;
    },

    close: function() {
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

