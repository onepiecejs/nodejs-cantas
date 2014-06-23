(function ($, _, Backbone) {

  "use strict";

  cantas.views.AppView = cantas.views.BaseView.extend({

    el: 'body',

    events: {
      'keyup .js-search-form': 'searchAction',
      'submit .js-search-form': 'searchAction',
      'focus .js-search-form': 'searchAction',
      'click .quick-search': function(e) {
        e.stopPropagation();
      }
    },

    initialize: function() {
      this.initNofiticationView();
      this.initQuickSearchView();
    },


    initNofiticationView: function() {
      this.notificationView = new cantas.views.NotificationView();

      cantas.socket.on('/notification:create', function(data) {
        var obj = new cantas.models.Notification(data);
        this.notificationView.notificationCollection.add(data);
      }.bind(this));
    },


    initQuickSearchView: function() {
      this.quickSearchView = new cantas.views.QuickSearchView({
        el: this.$('.quick-search-content')
      });
    },


    searchAction: function(e) {
      var code = e.keyCode || e.which;

      // Don't search if the user pressed esc or enter
      if (code === 27 || code === 13) {
        return;
      }

      e.preventDefault();
      var q = this.$('.js-search-form [name="query"]').val();
      this.quickSearchView.search(q);
    }


  });


}(jQuery, _, Backbone));