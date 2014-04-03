/**
 * Layout for the dashboard navigation
 */
(function ($, _, Backbone) {
  "use strict";

  cantas.views.DashboardNavigationView = cantas.views.BaseView.extend({

    events: {
      'click a': 'openDashboard'
    },

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

    openDashboard: function(e) {
      e.preventDefault();
      cantas.navigateTo($(e.target).attr('href'));
    },

    remove: function() {
      this.undelegateEvents();
      this.$el.empty();
      this.stopListening();
      return this;
    }

  });

}(jQuery, _, Backbone));