// Provide top-level namespaces for our javascript.
$(function ($, _, Backbone) {

  "use strict";

  var member = false;

  var Router = Backbone.Router.extend({
    routes: {
      "": "home",
      "boards/new": "newBoard",
      "boards/:query": "listBoards",
      "board/:boardId(/:slug)": "joinBoard",
      "card/:cardId(/:slug)": "renderCardDetail",
      "help": "help",
      "search/:query": "search"
    },

    currentView: null,

    switchView: function(view, context){
      if (this.currentView){
        this.currentView.remove();
      }
      this.currentView = view;
      this.currentView.render(context);
    },

    home: function(){
      this.navigate("boards/mine", {trigger: true, replace: true});
    },

    listBoards: function(query) {
      var that = this;
      $("body div.process-loading").show();
      $.ajax({
        url: '/api/' + query,
        success: function(boards) {
          $("body div.process-loading").hide();
          var boardsView = new cantas.views.BoardsView();
          that.switchView(boardsView, {"title": query, "boards": boards});
          $(".board-option").find(".active").removeClass("active");
          $(".js-boards-" + query).parent().addClass("active");
        },
        error: function() {
          cantas.utils.renderTimeoutBox();
          return false;
        }
      });
    },

    joinBoard: function(boardId) {
      var sock = cantas.socket;
      var that = this;

      sock.once('joined-board', function(result) {
        if (result.ok === 1) {
          that.navigate("boards/mine",{
            trigger: true, replace: true
          });
          cantas.utils.renderTimeoutBox();
        } else if (result.ok === 0) {
          if (result.message === 'nologin') {
            that.navigate("boards/mine",{
              trigger: true, replace: true
            });
            alert('You can\'t access a private Board! Please let Board admin invite you as an board member firstly!');
          } else {
            member = (result.message === 'member') ? true : false;
            //build visitor collection
            var visitors = that.setupVisitorCollection(result.visitors);
            that.renderBoard(boardId,visitors);
          }
        } else {
          that.navigate("boards/mine",{
              trigger: true, replace: true
            });
          alert('You came across a unknown bug, please file a bug to cantas-dev-list@redhat.com and help cantas project, thanks a lot.');
        }
      });
      sock.once('reconnect', function() {
        sock.emit('join-board', boardId);
      });
      sock.emit('join-board', boardId);
    },

    setupVisitorCollection: function(visitors) {
      return new cantas.models.BoardVisitorCollection(visitors);
    },

    renderBoard: function(boardId,visitors) {
      var that = this;
      var board = new cantas.models.Board({ _id: boardId });
      board.fetch({
        success: function (model, response, options){
          var boardView = new cantas.views.BoardView({
            model : model,
            response : response,
            options: options,
            member: member,
            visitors: visitors
          });
          // render board
          that.switchView(boardView);
          that.navigate("board/" + boardId + "/" + $.slug(response.title), {trigger: false, replace: true});
        },
        error: function(model, xhr, options) {
          console.log('fail');
        }
      });
    },

    renderCardDetail: function(cardId) {
      var that = this;
      var card = new cantas.models.Card({_id: cardId});
      card.fetch({
        success: function(model, response, options) {
          var list = new cantas.models.List({_id: response.listId});
          list.fetch({
            success: function(model, response, options) {
              that.navigate("board/" + response.boardId, {trigger: true, replace: true});
              var interval = setInterval(function(){
                var cardview = $("#" + cardId).find(".card-title");
                if(cardview.length > 0){
                  cardview.trigger("click");
                  clearInterval(interval);
                }
              }, 100);
            }
          });
        }
      });
    },

    help: function() {
      var helpView = new cantas.views.HelpView();
      this.switchView(helpView, {title: "Help"});
    },

    search: function(query) {
    },

    newBoard: function() {
      var query = 'new';
      var that = this;
      $.ajax({
        url: '/api/' + query,
        success: function(board) {
          that.joinBoard(board.boardId);
        },
        error: function() {
          cantas.utils.renderTimeoutBox();
          return false;
        }
      });
    }
  });

  cantas.appRouter = new Router;

  Backbone.history.start({pushState: true});

  cantas.navigateTo = function(url) {
    cantas.appRouter.navigate(url, {trigger: true});
  }

  cantas.appRouter.notificationView = new cantas.views.NotificationView();
  cantas.socket.on('/notification:create', function(data){
    var obj = new cantas.models.Notification(data);
    cantas.appRouter.notificationView.notificationCollection.add(data);
  });

  cantas.socket.on("badges:update", function(data){
    var card = cantas.utils.getCardModelById(data.cardId);
    card.set("badges", data.badges);
  });

}(jQuery, _, Backbone));
