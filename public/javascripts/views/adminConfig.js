// Admin Config View -- config vote and comment permission
// -------------------------------------------------------

(function ($, _, Backbone) {

  "use strict";


  /**
   * Permission control widget
   */
  cantas.views.PermissionWidgetView = cantas.views.BaseView.extend({

    template: jade.compile($("#template-permission-widget-view").text()),

    events: {
      'click .js-option': 'selectOption'
    },

    initialize: function(options) {
      if (!options.key) {
        throw new Error("You must specify the key on the model which should be modified");
      }

      _.bindAll(this, 'selectOption');
      this.model.on('change:' + options.key, this.render, this);
      this.key = options.key;
      this.selected = this.model.get(this.key);

      this.render();
      return this;
    },

    render: function() {
      this.$el.html(this.template({
        selected: this.selected
      }));
      this.renderLevel();
      return this;
    },

    renderLevel: function() {
      var $options = this.$('.js-option').removeClass('checked'),
        $selected = this.$('[data-permission="' + this.selected + '"]'),
        selectedIndex = $selected.index();

      $selected.addClass('checked').children("span:eq(1)").addClass("checked");

      $options.each(function(index, elem) {
        if (index >= selectedIndex) {
          $(elem).addClass('via').children("span:first").addClass("via");
        }
      });
    },

    /**
     * Change the selected permission
     */
    selectOption: function(e) {
      var patch = {},
        $target = $(e.target),
        $closest = $(e.target).closest('.js-option');

      if ($closest.length > 0) {
        $target = $closest;
      }

      var selected = $target.data('permission');
      if (this.selected === selected) {
        return;
      }

      this.selected = selected;
      this.model.set(this.key, selected);
      patch[this.key] = selected;
      this.model.patch(patch);

      this.renderLevel();
    },

    close: function() {
      this.remove();
    }

  });



  /*
   * View for modificaiton of a board's information.
   */
  cantas.views.ConfigView = Backbone.View.extend({
    el: "div.config-window",
    template: jade.compile($("#template-admin-config-view").text()),

    events: {
      'hidden.bs.modal': 'closeConfigView'
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));

      this.voteConfig = new cantas.views.PermissionWidgetView({
        el: this.$('.js-vote'),
        model: this.model,
        key: 'voteStatus'
      });

      this.commentConfig = new cantas.views.PermissionWidgetView({
        el: this.$('.js-comment'),
        model: this.model,
        key: 'commentStatus'
      });

      this.listConfig = new cantas.views.PermissionWidgetView({
        el: this.$('.js-list'),
        model: this.model,
        key: 'listStatus'
      });

      this.cardConfig = new cantas.views.PermissionWidgetView({
        el: this.$('.js-card'),
        model: this.model,
        key: 'cardStatus'
      });

      return this;
    },

    modal: function() {
      this.$el.modal();
    },

    show: function() {
      this.render().modal();
    },

    closeConfigView: function() {
      this.voteConfig.close();
      this.commentConfig.close();
      this.listConfig.close();
      this.cardConfig.close();

      // clear configView
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();
    }
  });

}(jQuery, _, Backbone));
