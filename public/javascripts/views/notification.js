
$(function ($, _, Backbone) {

  "use strict";

  window.cantas = window.cantas || {};
  cantas.user = cantas.user || {};

  cantas.views.NotificationView = Backbone.View.extend({
    el: "ul.dropdown-notification",

    events: {
      "click .js-all-read": "markAllAsRead"
    },

    initialize: function(options) {
      var that = this;
      this.notificationCollection = new cantas.models.NotificationCollection;
      this.notificationCollection.on('add', this.render, this);
      this.notificationCollection.fetch({data: {isUnread: true, userId: cantas.user.id}, success: function(collection, response, options){
        that.render();
      }});
    },

    render: function() {
      var html = '<li class="all-read"><a class="js-all-read">Mark All as Read</a></li>';
      this.$el.html(html);
      this._updateReminder();
      this._renderItems();
      return this;
    },

    _renderItems: function(){
      var that = this;
      that.notificationCollection.forEach(function(notify){
        var itemView = new cantas.views.NotificationItemView({model: notify});
        that.$el.append(itemView.render().el);
      });

      return that;
    },

    _updateReminder: function(){
      var count = this.notificationCollection.where({isUnread: true}).length;
      var reminder = $(this.$el.parent()).find("a.reminder");
      if (count === 0){
        $(reminder).hide();
      }else{
        $(reminder).show();
      }
      $(reminder).html(count);
    },

    markAllAsRead: function(){
      var that = this;
      that.notificationCollection.forEach(function(notify){
        notify.patch({isUnread: false});
      });
      that._updateReminder();
      that.$el.find("li.unread").removeClass("unread");
    }

  });

  cantas.views.NotificationItemView = Backbone.View.extend({
    tagName: "li",

    template: jade.compile($("#template-notification-item-view").text()),

    initialize: function(options) {
    },

    render: function() {
      if (this.model.get("isUnread")){
        this.$el.addClass("unread");
      }
      var notification = this.model.toJSON();
      notification.message = markdown.toHTML(notification.message);
      notification.created = cantas.utils.formatDate(notification.created);
      this.$el.html(this.template(notification));
      return this;
    }

  });

}(jQuery, _, Backbone));
