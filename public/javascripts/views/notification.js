
(function ($, _, Backbone) {

  "use strict";

  window.cantas = window.cantas || {};
  cantas.user = cantas.user || {};

  cantas.views.NotificationView = Backbone.View.extend({
    el: '.js-notification-menu',

    template: jade.compile($('#template-notification-menu-view').text()),

    events: {
      'click .js-dropdown-toggle': 'renderOnePageItems',
      'hide.bs.dropdown': 'clearPageContent',
      'click .js-show-more': 'renderOnePageItems',
      'click .js-all-read': 'markAllAsRead',
      'click .js-dropdown-content li.unread': 'hasRead'
    },

    initialize: function(options) {
      var that = this;
      this.notificationCollection = new cantas.models.NotificationCollection();
      this.listenTo(this.notificationCollection, 'add', this.renderItem);
      this.listenTo(this.notificationCollection, 'change:isUnread', this.setToRead);
      this.notificationItemViews = [];

      this.notificationCollection.fetch(
        {
          data: {
            isUnread: true,
            userId: cantas.user.id
          },
          reset: true,
          success: function() {
            that.render();
          }
        }
      );
      this.pageSize = 10;
      this.pageBegin = 0;
    },

    render: function() {
      this.$el.html(this.template());
      this._updateReminder();

      return this;
    },

    clearPageContent: function(event) {
      var content = this.$('.js-dropdown-content');
      if (content.children().length > 0) {
        content.empty();
        this.notificationItemViews = [];
        this.pageBegin = 0;
      }
    },

    renderOnePageItems: function(event) {
      if (!$(event.target).is('.js-dropdown-toggle')) {
        event.stopPropagation();
      }
      var pageEnd = this.pageBegin + this.pageSize;
      var onePageItems = _.filter(this.notificationCollection.slice(this.pageBegin, pageEnd),
        function(model) {
          return model.toJSON().isUnread === true;
        });

      if (onePageItems.length > 0) {
        var onePageItemViews = onePageItems.map(this.renderItem, this);
        this.notificationItemViews = _.union(this.notificationItemViews, onePageItemViews);
        this.$('.js-dropdown-content').append(_.map(onePageItemViews, this.getItemDom, this));
        this.pageBegin = this.notificationItemViews.length;
        this._updateReminder();
      } else {
        return;
      }
    },

    renderItem: function(item, collection, options) {
      var that = this;
      var itemView = new cantas.views.NotificationItemView({ model: item });
      if (options && options.add === true) {
        this.$('.js-dropdown-content').prepend(this.getItemDom(itemView));
        this.pageBegin++;
        this.notificationItemViews.push(itemView);
        this._updateReminder();
      }

      return itemView;
    },

    getItemDom: function(view) {
      return view.render().el;
    },

    _updateReminder: function() {
      var count = this.notificationCollection.where({isUnread: true}).length;
      var reminder = this.$('.reminder');
      if (count === 0) {
        reminder.hide();
      } else {
        reminder.show();
      }
      reminder.html(count);
    },

    markAllAsRead: function(event) {
      event.stopPropagation();

      this.notificationCollection.forEach(function(notify) {
        notify.patch({isUnread: false});
      });
      this.pageBegin = 0;
      this._updateReminder();
      this.$('ul.js-dropdown-content li.unread').removeClass('unread');
    },

    hasRead: function(event) {
      event.stopPropagation();

      this.notificationCollection.get($(event.target).closest('li').prop('id'))
        .patch({isUnread: false});
    },

    setToRead: function(item) {
      this.$('#' + item.id).removeClass('unread');
      this._updateReminder();
    }

  });

  cantas.views.NotificationItemView = Backbone.View.extend({
    tagName: "li",

    template: jade.compile($("#template-notification-item-view").text()),

    initialize: function(options) {
    },

    render: function() {
      if (this.model.get("isUnread")) {
        this.$el.addClass("unread");
      }
      this.$el.prop('id', this.model.id);
      var notification = this.model.toJSON();
      notification.message = markdown.toHTML(notification.message);
      notification.created = cantas.utils.formatDate(notification.created);
      this.$el.html(this.template(notification));
      return this;
    }

  });

}(jQuery, _, Backbone));
