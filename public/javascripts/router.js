// Provide top-level namespaces for our javascript.
$(function ($, _, Backbone) {

  "use strict";

  window.cantas = window.cantas || {};

  var isMember = false;

  var Router = Backbone.Router.extend({
    routes: {
      "": "home",
      "boards/new": "newBoard",
      "boards/:query": "listBoards",
      "cards/:query": "listCards",
      "board/:boardId(/:slug)": "joinBoard",
      "card/:cardId(/:slug)": "renderCardDetail",
      "help": "help",
      "welcome": "welcome",
      "search/:query": "search"
    },

    currentView: null,

    switchView: function(view, context){
      if (this.currentView){
        this.currentView.close();
      }

      // Handle board leave
      var sock = cantas.socket;
      if (this.currentView && this.currentView.boardTitleView) {
        //logout the board
        var leaveBoardId = this.currentView.model.id;
        sock.emit('user-logout', {boardId: leaveBoardId, user: cantas.utils.getCurrentUser()});
      }

      this.currentView = view;
      this.currentView.render(context);

      // check the switch view is boardView
      if (view && view.boardTitleView) {
        var joinBoardId = view.model.id;
        sock.emit('join-board', joinBoardId);
      }
    },

    home: function(){
      if(cantas.utils.isBrowserVersionLow()) {
        cantas.utils.renderBrowserVesionPrompt();
      }
      else {
        this.navigate("boards/mine", {trigger: true, replace: true});
      }
    },

    listBoards: function(query) {
      if(cantas.utils.isBrowserVersionLow()) {
        return cantas.utils.renderBrowserVesionPrompt();
      }

      // Create the dashboard layout view
      var dashboardView = new cantas.views.DashboardView().render();
      dashboardView.setNavigationView(new cantas.views.DashboardNavigationView().render().setActive('nav-boards-' + query));

      $("body div.process-loading").show();

      $.ajax({
        url: '/api/' + query
      })
      .done(function(boards) {
        $("body div.process-loading").hide();

        var boardsView = new cantas.views.BoardsView().render({"title": query, "boards": boards});
        
        // Set the dashboard content section
        dashboardView.setContentView(boardsView);

        // Swithch the main view out for the dashboard view
        this.switchView(dashboardView);
      }.bind(this))
      .fail(function() {
        cantas.utils.renderTimeoutBox();
        return false;
      });
    },


    listCards: function(query) {
      var that = this;
      if(cantas.utils.isBrowserVersionLow()) {
        return cantas.utils.renderBrowserVesionPrompt();
      }

      var method = "fetchMyCards", title = "My Cards";

      if ( query === "subscribed" ) {
        method = "fetchSubscribedCards", title = "Subscribed Cards";
      }

      if ( query === "assigned" ) {
        method = "fetchAssignedCards", title = "Assigned Cards";
      }

      // Create the dashboard layout view and set the navigation view
      var dashboardView = new cantas.views.DashboardView().render();
      dashboardView.setNavigationView(new cantas.views.DashboardNavigationView().render().setActive('nav-cards-' + query));

      $("body div.process-loading").show();

      // Get the user's cards and set the card list view
      new cantas.models.CardCollection()[method](function(collection) {
        $("body div.process-loading").hide();

        // Set the dashboard content section
        dashboardView.setContentView(new cantas.views.CardListView({
          collection: collection,
          title: title
        }).render());

        that.switchView(dashboardView);
      });
    },


    joinBoard: function(boardId) {
      var sock = cantas.socket;
      var that = this;
      if(cantas.utils.isBrowserVersionLow()) {
        cantas.utils.renderBrowserVesionPrompt();
      }
      else {
        sock.once('joined-board', function(result) {
          if (result.ok === 1) {
            if (result.message === 'closed') {
              alert('This board is closed by board creator. Any further operation, please contact the creator.');
              that.navigate("boards/mine",{
                trigger: true, replace: true
              });
            } else if (result.message === 'nologin') {
              that.navigate("boards/mine", {
                trigger: true, replace: true
              });
              alert('You can\'t access a private Board! Please let Board admin invite you as an board member firstly!');
            } else {
              that.navigate("boards/mine",{
                trigger: true, replace: true
              });
              cantas.utils.renderTimeoutBox();
            }
          } else if (result.ok === 0) {
              isMember = (result.message === 'isMember') ? true : false;
              //build visitor collection
              var visitors = that.setupVisitorCollection(result.visitors);
              that.renderBoard(boardId, visitors);
          } else {
            that.navigate("boards/mine",{
                trigger: true, replace: true
              });
            alert('You came across a unknown bug, please file a bug to cantas-dev-list@redhat.com and help cantas project, thanks a lot.');
          }
        });
        // sock.once('reconnect', function() {
        //   sock.emit('join-board', boardId);
        // });
        sock.emit('join-board', boardId);
      }
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
            isMember: isMember,
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
      if(cantas.utils.isBrowserVersionLow()) {
        cantas.utils.renderBrowserVesionPrompt();
      }
      else {
        var helpView = new cantas.views.HelpView();
        this.switchView(helpView, {title: "Help"});
      }
    },

    welcome: function() {
      var welcomeView = new cantas.views.WelcomeView();
      this.switchView(welcomeView, {title: "Welcome"});
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

  cantas.socket.on("cover:update", function(data){
    var card = cantas.utils.getCardModelById(data.cardId);
    card.set("cover", data.cover);
  });

  cantas.socket.on("badges:update", function(data){
    var card = cantas.utils.getCardModelById(data.cardId);
    card.set("badges", data.badges);
  });

  /*
   * FIXME: import-trello-complete is trigger by a specifed board,here we
   * should be add a boardId to eventName, it will help every board recevied
   * a dedicate msg, and in context, the message only happen in one board,
   * not in router, the global interface, So sometime, we need move this bind
   * to board level declaration
   */
  cantas.socket.on("alert-import-trello-complete", function(data){
    cantas.utils.renderImportTrelloBox();
  });

}(jQuery, _, Backbone));
