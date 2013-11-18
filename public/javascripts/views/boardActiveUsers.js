/*
 * Board active userlist view
 */

(function ($, _, Backbone) {
  "use strict";

  var VisitorView = Backbone.View.extend({
    tagName: 'div',
    className: 'scroll-content-item',

    initialize: function(options) {
      this.render = _.bind(this.render, this);
      this.model.on("change:username", this.render);
    },

    render: function() {
      var role = this.model.get('role');
      var nickname = "<p>" + this.model.get('username') +
        '</p><div class="role-' + role.name +
        '" title="' + role.desc + '"></div>';
      this.el.innerHTML = nickname;
      return this;
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      this.$el.remove();
      this.model.dispose();
      return this;
    }

  });

  cantas.views.BoardActiveUserCollectionView = Backbone.View.extend({
    initialize: function(data) {
      this._visitorViews = {};

      this.collection.on('add', this.addChange, this);
      this.collection.on('remove', this.removeChange, this);
      this.boardId = data.boardId;
      //bind socket event to update collection
      this.socketInit();
    },

    remove: function() {
      _.each(this._visitorViews, function(view) {
        view.remove();
      });
      this._visitorViews = {};
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();
      return this;
    },

    removeChange: function(visitor) {
      var that = this;
      if (that._visitorViews[visitor.id]) {
        var visitorView = that._visitorViews[visitor.id];
        delete that._visitorViews[visitor.id];
        $(visitorView.el).fadeOut('slow', function() {
          visitorView.remove();
        });
      }
    },

    addChange: function(visitor) {
      var that = this;
      var visitorView = new VisitorView({
          model : visitor
        });
      that._visitorViews[visitor.id] = visitorView;
      that.$el.find('.scroll-content').append(visitorView.render().el);
    },

    socketInit: function() {
      var that = this;
      var sock = cantas.socket;

      sock.removeAllListeners("user-login:board:"  + that.boardId);
      sock.removeAllListeners("user-logout:board:" + that.boardId);
      sock.removeAllListeners("user-leave-all-room");

      sock.on("user-login:board:" + that.boardId, function(data) {
        var visitor = new cantas.models.BoardVisitor(data.visitor);
        that.collection.add(visitor);
      });
      sock.on("user-logout:board:" + that.boardId, function(data) {
        var visitor = that.collection.get({id: data.visitor._id});
        that.collection.remove(visitor);
      });
      sock.on("user-leave-all-room", function(data) {
        var visitor = that.collection.get({id: data.visitor._id});
        that.collection.remove(visitor);
      });
    },

    render: function() {
      $(this.el).empty();
      var that = this;
      this.collection.forEach(function(visitor) {
        var thatView = new VisitorView({model: visitor});
        that._visitorViews[visitor.id] = thatView;
        // Render each sub-view and append it to the parent view's element.
        $(that.el).append(thatView.render().el);
      });

      return this;
    }
  });

}(jQuery, _, Backbone));
