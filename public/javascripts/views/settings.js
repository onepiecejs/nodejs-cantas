/**
 * Page view for viewing / changing settings of current account
 */

(function ($, _, Backbone) {

  "use strict";

  cantas.views.settingsView = Backbone.View.extend({
    events: {
    },

    template: jade.compile($("#template-settings-view").text()),

    initialize: function () {
    },

    render: function (context) {
      cantas.setTitle(this.options.title);

      this.$el.html(this.template({
        header: this.options.title,
        username: cantas.user.username
      }));

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
  })

}(jQuery, _, Backbone));