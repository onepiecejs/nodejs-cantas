/*
 * Board active userlist view
 */

$(function ($, _, Backbone) {
  "use strict";

  var VisitorView = Backbone.View.extend({
    tagName: 'div',
    className: 'scroll-content-item',

    initialize: function(options) {
      this.render = _.bind(this.render, this);
      this.model.on("change:username", this.render);
      this.model.on('remove', this.serverRemove, this);
    },

    render: function() {
      var role = this.model.get('role');
      var nickname = "<p>" + this.model.get('username') + '</p><div class="role-' + role.name + '" title="' + role.desc + '"></div>';
      this.el.innerHTML = nickname;
      return this;
    },

    serverRemove: function(){
      var that = this;
      $(this.el).fadeOut('slow',function() {
        that.remove();
      });
    },

    remove: function(){
      this.undelegateEvents();
      this.stopListening();
      this.$el.remove();
      return this;
    }

  });

  cantas.views.BoardActiveUserCollectionView = Backbone.View.extend({
    initialize : function(data) {
      this._visitorViews = [];

      var that = this;
      this.collection.each(function(visitor) {
        that._visitorViews.push(new VisitorView({
          model : visitor
        }));
      });

      this.collection.on('add', this.updateRender, this);
      this.boardId = data.boardId;
      //bind socket event to update collection
      this.socketInit();
    },

    remove: function(){
      this._visitorViews.forEach(function(view){
        view.remove();
      });
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();
      return this;
    },

    updateRender: function(visitor){
      var that = this;
      var visitorView = new VisitorView({
          model : visitor
        });
      that._visitorViews.push(visitorView);
      that.$el.find('.scroll-content').append(visitorView.render().el);
    },

    socketInit: function() {
      var that = this;
      var sock = cantas.socket;
      sock.on("user-login:board:"+that.boardId, function(data) {
        var visitor = new cantas.models.BoardVisitor(data.visitor);
        that.collection.add(visitor);
      });
      sock.on("user-logout:board:"+that.boardId, function(data) {
        var visitor = new cantas.models.BoardVisitor(data.visitor);
        that.collection.remove(visitor);
      });
      sock.on("user-leave-all-room", function(data) {
        var visitor = new cantas.models.BoardVisitor(data.visitor);
        that.collection.remove(visitor);
      });
    },

    render : function() {
      var that = this;
      $(this.el).empty();
      // Render each sub-view and append it to the parent view's element.
      _(this._visitorViews).each(function(view) {
        $(that.el).append(view.render().el);
      });
      return this;
    }
  });

}(jQuery, _, Backbone));
