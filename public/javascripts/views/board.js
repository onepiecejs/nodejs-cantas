// Board View

(function ($, _, Backbone) {

  "use strict";
  window.cantas.isBoardMember = false;

  var BoardTitleView = Backbone.View.extend({
    el: "#board-header",
    tagName: "header",
    id: "board-header",

    template: jade.compile($("#template-board-title-view").text()),

    events: {
      "click .js-edit-board-title": "edit",
      "click #board-title-save": "saveButtonClicked",
      "click #board-title-input": "boardTitleInputClicked",
      "keypress #board-title-input": "boardTitleInputKeypressed",
      "click .js-toggle-board-menu": "toggleBoardMenu"
    },

    initialize: function(options) {
      this.model.on("invalid", function(model, error) {
        alert(error);
      });
      this.model.on("change:title", this.titleChangedFromOthers);

      //when clicking outside area of the board-menu, it will disappear.
      $("body").on("click", function (event) {
        var e = event || window.event;
        var elem = e.srcElement || e.target;
        while (elem && elem !== $("body")[0]) {
          if (elem.className.indexOf("board-menu") > -1) {
            return;
          }
          elem = elem.parentNode;
        }
        $(".board-menu").hide();
      });
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      return this;
    },

    /*
     * Get current board title from the textbox with ID #board-title-input
     */
    getBoardTitle: function() {
      return $("#board-title-input").val();
    },

    titleChangedFromOthers: function(model, title) {
      var div = $(".js-edit-board-title");
      div.html(cantas.utils.safeString(title));
      div.attr("title", div.text());
    },

    edit: function(event) {
      // Prevents the click event from bubbling up.
      event.stopPropagation();

      var div = $("div.js-edit-board-title");
      div
        .html(this.template())
        .removeAttr("title") // not show full title in tip while editing
        .removeClass("js-edit-board-title board-title")
        .addClass("board-title-edit");

      // Focus input on the textbox to help user enter conveniently.
      $("#board-title-input")
        .val(this.model.get("title"))
        .focus()
        .select();

      this.attributes.expandedViewChain = cantas.utils.rememberMe(
        this,
        this.attributes.expandedViewChain
      );
    },

    saveTitle: function() {
      var title = this.getBoardTitle().trim();
      if (title.length === 0) {
        alert("Please enter a board title.");
      } else {
        var origin_title = this.model.get("title");
        var result = this.model.set({ "title": title },
                                    { validate: true });
        if (result && this.model.hasChanged("title")) {
          this.model.patch({
            title: this.model.get("title"),
            original: {title: origin_title}
          });
        }
      }
      return true;
    },


    /*
     * When click the textbox to focus on it, it does not allow the click
     * event to propagate to document to cause restoring the edit area.
     *
     * Simple event handler, and it does not need any resource from current
     * view, so define here to keep it directly.
     */
    boardTitleInputClicked: function(event) {
      event.stopPropagation();
    },

    saveButtonClicked: function(event) {
      /*
       * When validation fails before saving board's title, stop canceling edit
       * operation.
       */
      if (!this.saveTitle()) {
        event.stopPropagation();
      }
    },

    /*
     * When user press enter while the textbox has input focus, accept the title
     * and save it.
     */
    boardTitleInputKeypressed: function(event) {
      if (event.which === 13) {
        if (this.saveTitle()) {
          $("body").trigger("click");
        }
      }
    },

    // Collapse the edit control area
    collapse: function() {
      var divContainer = $("#board-edit-title").parent("div");
      var editPlaceholder = divContainer.html();
      divContainer
        .html($("#board-title-placeholder").html())
        .addClass("js-edit-board-title board-title")
        .removeClass("board-title-edit")
        .html(cantas.utils.safeString(this.model.get("title")))
        .attr("title", divContainer.text());
    },

    toggleBoardMenu: function(event) {
      $(".board-menu").css("left", $(event.target).position().left + 20).toggle();
    }

  });

  var ArchivedItemView = Backbone.View.extend({
    tagName: "li",
    className: "",
    template:  jade.compile($("#template-archived-items-view").text()),
    section: "lists",

    initialize: function(data) {
      _.bindAll(this, "render");
      this.section = data.section;
      this.highlighted = data.highlighted;
    },

    events: {
      "click .js-reopen": "reopenArchivedList",
      "click .js-cards-reopen": "reopenArchivedCard"
    },

    render: function() {
      this.$el.html(this.template({
        item: this.model,
        section: this.section,
        highlighted: this.highlighted
      }));
      return this;
    },

    reopenArchivedList: function(event) {
      event.preventDefault();
      event.stopPropagation();
      var listId = $(event.target).data("listid");
      var thatList = new cantas.models.List({_id: listId});

      var sortArray = cantas.utils.getCurrentBoardModel().listCollection.pluck('order');
      sortArray.sort(function(a, b) {
        return (a - b);
      });
      var lastListOrder = ('undefined' === typeof _.last(sortArray)) ? -1 : _.last(sortArray);
      var newListOrder = lastListOrder + 65536;

      thatList.fetch({
        success: function(model, response, options) {
          model.patch({
            isArchived: false,
            order: newListOrder,
            original: {isArchived: true}
          }, {silent: true});
        }
      });

      this.remove();
    },

    reopenArchivedCard: function(event) {
      var cardId = $(event.target).data("cardid");
      var thatCard = new cantas.models.Card({_id: cardId});

      thatCard.fetch({
        success: function (model, response, options) {
          //get that card's self listView
          var currentBoardView = cantas.utils.getCurrentBoardView();
          var viewIdArray = _.map(currentBoardView.listViewCollection, function(child) {
            return child.model.id;
          });
          var inListViewIndex = _.indexOf(viewIdArray, model.get("listId"));
          // the listView is not exist in this board
          if (-1 === inListViewIndex) {
            var queryCards = '/api/archived/getorders/' + model.get("listId");
            $.ajax({
              url: queryCards
            })
              .success(function(items) {
                var sortArray = _.pluck(items, 'order');
                sortArray.sort(function(a, b) {
                  return (a - b);
                });
                var lastCardOrder = null;
                if (typeof _.last(sortArray) === 'undefined') {
                  lastCardOrder = -1;
                } else {
                  lastCardOrder = _.last(sortArray);
                }
                var newCardOrder = lastCardOrder + 65536;
                model.patch({
                  isArchived: false,
                  'order': newCardOrder,
                  original: {isArchived: true}
                }, { silent: true });
              })
              .fail(function() {
                cantas.utils.renderTimeoutBox();
                return false;
              });
          } else {
            // if the listView exist in this board
            var inListView = cantas.utils.getCurrentBoardView().listViewCollection[inListViewIndex];
            var sortArray = inListView.model.cardCollection.pluck('order');
            sortArray.sort(function(a, b) {
              return (a - b);
            });
            var lastCardOrder = null;
            if (typeof _.last(sortArray) === 'undefined') {
              lastCardOrder = -1;
            } else {
              lastCardOrder = _.last(sortArray);
            }
            var newCardOrder = lastCardOrder + 65536;
            // update and pushlish card changed
            model.patch({
              isArchived: false,
              order: newCardOrder,
              original: {isArchived: true}
            }, {silent: true});
          }
        }
      });

      //remove reOpenArchived link
      this.remove();
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      this.$el.remove();
    }

  });

  var BoardDescriptionView = Backbone.View.extend({
    el: "#board-description",
    tagName: "div",
    className: "modal board-description hide",
    events: {
      "click #save-board-edit": "saveClicked",
      "click #cancel-board-edit": "collapse",
      "click #close-board-edit": "collapse"
    },

    initialize: function(data) {
      $("a.board-info").on("click", this, this.toggleInfoEdition);
      this.model.on("invalid", function(model, error) {
        alert(error);
      });
      $("#board-description").on("click", function(event) {
        // Prevents the click event from bubbling up.
        event.stopPropagation();
      });
      this.model.on("change:description", this.descriptionChangedFromOthers);
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      return this;
    },

    toggleInfoEdition: function(event) {
      // Prevents the click event from bubbling up.
      event.stopPropagation();

      var view = event.data;
      if ($("div#board-description").hasClass("hide")) {
        $(".board-menu").hide();
        $(".list-menu,.js-list-setting").hide();
        $(".card-menu,.card-setting").hide();
        view.showInfoEditionDialog();
      } else {
        view.collapse();
      }
    },

    showInfoEditionDialog: function() {
      $("div#board-description").removeClass("hide");
      $("#board-description-text")
        .val(this.model.get("description"));
      this.attributes.expandedViewChain = cantas.utils.rememberMe(
        this,
        this.attributes.expandedViewChain
      );
    },

    descriptionChangedFromOthers: function(model, description) {
      $("#board-description-text").text(description);
    },

    saveClicked: function(event) {
      var description = $("#board-description-text").val().trim();
      var origin_description = this.model.get("description");
      var result = this.model.set({ "description": description },
                                  { validate: true });
      if (result !== false && this.model.hasChanged("description")) {
        this.model.patch({
          description: this.model.get("description"),
          original: {description: origin_description}
        });
      }
      $("body").trigger("click");
    },

    // Collpase the edit control area
    collapse: function() {
      $("div#board-description").addClass("hide");
      if (this.model.hasChanged("description")) {
        $("textarea#board-description-text").val(this.model.get("description"));
      }
      this.attributes.expandedViewChain = cantas.utils.forgetMe(
        this,
        this.attributes.expandedViewChain
      );
    }
  });

  var AddListView = Backbone.View.extend({
    el: "div#list-new",

    events: {
      "click .js-create-new-list": "saveNewList",
      "keypress #list-title": "keyPressed"
    },

    initialize: function(options) {
      this.title = "Untitled List";
    },

    render: function() {
      $("div.board-menu").hide();
      this.$el.modal();
      this.$el.find("#list-title").val(this.title).select();
      return this;
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      this.$el.hide();
      return this;
    },

    saveNewList: function(event) {
      event.stopPropagation();
      var title = $("#list-title").val().trim();
      if (title) {
        var newList = new cantas.models.List({
          title: title,
          boardId: this.model.id,
          creatorId: cantas.user.id,
          order: this.calcPos()
        });
        newList.save();
        this.$el.modal("hide");
      } else {
        $("#list-title").select();
      }
    },

    keyPressed: function(event) {
      if (event.which === 13) {
        this.saveNewList(event);
      }
    },

    calcPos: function() {
      var listOrder = -1;
      var listCollection = this.model.listCollection;
      var listCount = listCollection.length;
      if (listCount === 0) {
        listOrder = listOrder + 65536;
      }
      if (listCount > 0) {
        var lastOrder = _.last(listCollection.pluck("order"));
        listOrder = lastOrder + 65536;
      }
      return listOrder;
    }
  });

  var ArchivedView = Backbone.View.extend({
    el: "div.window-overlay",
    template: jade.compile($("#template-archived-view").text()),
    archivedItemViews: [],

    initialize: function(data) {
      _.bindAll(this, "render");
      this.section = (data && data.section) ? data.section : "lists";
      this.highlighted = (data && data.highlighted) ? data.highlighted : null;
    },

    events: {
      "click .js-switch-section": "switchSections",
      "hidden.bs.modal": "closeArchivedWindow"
    },

    render: function() {
      this.$el.html(this.template({
        section: this._toTitleCase(this.section)
      }));
      this.$el.find("." + this.section + "-tab").addClass("active");
      this.$el.modal();

      this._renderArchivedItems(this.el);
      return this;
    },

    switchSections: function() {
      if (this.section === "cards") {
        this.section = "lists";
      } else {
        this.section = "cards";
      }
      return this.render();
    },

    _toTitleCase: function(title) {
      return title.charAt(0).toUpperCase() + title.substr(1).toLowerCase();
    },

    _renderArchivedItems: function(elArchive) {
      var that = this;
      var thatElem = $(elArchive).find("ul.js-archive-items");
      var archiveCardApi = "/api/archived/cards/" + cantas.utils.getCurrentBoardModel().id;
      var archiveListApi = "/api/archived/lists/" + cantas.utils.getCurrentBoardModel().id;
      var queryArchived = ("cards" === that.section) ? archiveCardApi : archiveListApi;
      var archivedItemViews = this.archivedItemViews;

      $.ajax({
        url: queryArchived,
        success: function(items) {
          thatElem.parents("div.modal-body").find("p").hide();
          _.each(items, function(item) {
            var archiveItemView = new ArchivedItemView({
              model: item,
              section: that.section,
              highlighted: that.highlighted
            });
            thatElem.append(archiveItemView.render().el);
            archivedItemViews.push(archiveItemView);
          });
        },
        error: function() {
          cantas.utils.renderTimeoutBox();
          return false;
        }
      });
    },

    closeArchivedWindow: function() {
      //clear child view event
      var archivedItemViews = this.archivedItemViews;
      //clear all archivedItemViews event listening
      _.each(archivedItemViews, function(view) {
        view.remove();
        archivedItemViews.pop(view);
      });
      // clear archived window event
      this.undelegateEvents();
      this.stopListening();
      this.$el.empty();
    }

  });


  var ImportTrelloDialogView = Backbone.View.extend({
    el: 'div#import-trello-dialog',

    events: {
      'click #import-trello-complete': 'reloadBoard'
    },

    initialize: function(options) {

    },

    render: function() {
      this.$el.modal({
        'keyboard': false
      });

      this.$('#import-trello-processing').children().show();

      return this;
    },

    remove: function() {
      this.undelegateEvents();
      this.stopListening();
      this.$el.hide();
      return this;
    },

    reloadBoard: function(event) {
      event.stopPropagation();
      var importTrelloMessage = this.$('#import-trello-message').text();
      if (importTrelloMessage.indexOf('completed') > -1) {
        window.location.reload();
      } else if (importTrelloMessage.indexOf('Error:') > -1) {
        if (importTrelloMessage.indexOf('check file content') === -1) {
          window.location.reload();
        }
      }

      this.$el.modal("hide");
    }

  });

  cantas.views.BoardView = Backbone.View.extend({
    el: '.content',
    // Delegated events for creating new items, and clearing completed ones.

    template: jade.compile($("#template-board-view").text()),

    events: {
      'updatesort': 'updateSort',
      "click .js-archived-items": "openArchivedItems",
      'click .js-import-bugzilla': 'openImportBugzillaWindow',
      'click .js-import-trello': 'importTrelloJSON',
      "click .js-add-list": "addList",
      "dblclick .board-content": "addList",
      "click .js-select-private": "toggleVisibility",
      "click .js-toggleInvite": "toggleInviteMember",
      "click .board-side-scroll a": "scrollBoardContent",
      "mousedown .board-side-scroll a": "startScrollBoardContent",
      "mouseup .board-side-scroll a": "stopScrollBoardContent",
      "click .js-close-board": "closeBoardClicked",

      'click .js-show-configuration': 'onShowConfigurationClick'
    },

    initialize: function(data) {
      window.cantas.isBoardMember = data.isMember;
      // cache list view instance.
      this.listViewCollection = [];

      this.visitors = data.visitors;
      this.state = data.state;

      this.model.listCollection.fetch({data: {boardId: this.model.id}, reset: true});

      this.model.listCollection.on('add', this.addOne, this);
      // `reset` initialize and recursively load list inside board.
      this.model.listCollection.on('reset', this.addAll, this);
      this.model.on('change:isPublic', this.resetVisibility, this);
      this.model.on("change:isClosed", this.onBoardClosed, this);

      this.memberCollection = new cantas.models.BoardMemberCollection();
      this.activityCollection = new cantas.models.ActivityCollection();

      // we won't render the whole board each time when it's changed.
      // render is only called when board is initiated.
      // this.model.on('change', this.render, this);

      // adjust list max-height upon window resize
      $(window).bind("resize", _.bind(this.resize, this));

      /*
       * Currently, registering document's click event to collapse previous
       * epanded editing or setting view.
       */
      $("body").on("click", this, this.bodyClicked);

      /*
       * For collapsing previous expanded views, I record them in this array.
       * The view that is being expanded is appended to this array.
       * Document's click event will pop and try to collapse the previous
       * expanded view.
       *
       * Now we only allow one expanded control area appears in page at a time.
       * which is guaranteed by view's rememberMe function.
       */
      this._expandedViewChain = [];

      this.timers = [];
      this.timer_scrollBoard = 0;
      this.flag_continueScrollBoard = false;
      this.timer_continueScrollBoard = 0;
    },

    /**
     * Load the state of the board view
     * (Open modals, highlight cards, etc)
     */
    loadState: function() {
      if (!this.state || !this.state.view) {
        return;
      }

      var viewChain = this.state.view.split('.'),
        subview = viewChain[0];

      if (subview === 'archived') {
        return new ArchivedView({
          section: viewChain[1],
          highlighted: this.state.highlighted
        }).render();
      }
    },

    onShowConfigurationClick: function(event) {
      var configView = new cantas.views.ConfigView({model: this.model});
      configView.show();
    },

    openArchivedItems: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $("div.board-menu").hide();
      var archivedView = new ArchivedView();
      archivedView.render();
    },

    openImportBugzillaWindow: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $("div.board-menu").hide();
      var importBugzillaView = new cantas.views.ImportBugzillaView({'model': this.model});
      importBugzillaView.render();
    },

    importTrelloJSON: function(event) {
      event.preventDefault();
      event.stopPropagation();
      $('#import-trello').click();
      $("div.board-menu").hide();
    },

    addList: function(event) {
      event.preventDefault();
      //event.stopPropagation();
      this.addListView.render();
    },

    close: function() {
      this.addListView.remove();
      this.boardTitleView.remove();
      this.boardDescriptionView.remove();
      this.boardMembersManageView.collection.dispose();
      this.boardMembersManageView.remove();
      this.boardActiveUserView.collection.dispose();
      this.boardActiveUserView.remove();
      this.activityView.collection.dispose();
      this.activityView.remove();
      this.listViewCollection.forEach(function(view) {
        view.remove();
      });
      this.model.dispose();
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();

      return this;
    },

    resize: function () {
      this.$el.find(".list-content").css('max-height', ($("#board").height() - 90));
    },

    render: function(e) {
      if (typeof this.model === 'undefined') {
        return false;
      }

      this.$el.html(this.template(this.model.toJSON()));
      cantas.setTitle("Board|" + this.model.get("title"));

      var visibility = this.model.get("isPublic");
      if (!visibility) {
        this.$el.find("a.js-select-private").addClass("active").attr("title", "Set to public");
      }

      //render lists iterator
      var that = this;
      // this.model.listCollection.forEach(function (list) {
      //   that.addOne(list);
      // });

      this.boardTitleView = new BoardTitleView({
        model: this.model,
        attributes: {
          expandedViewChain: this._expandedViewChain
        }
      });

      this.boardDescriptionView = new BoardDescriptionView({
        model: this.model,
        attributes: {
          expandedViewChain: this._expandedViewChain
        }
      });

      this.addListView = new AddListView({
        model: this.model,
        attributes: {
          expandedViewChain: this._expandedViewChain
        }
      });

      this.importTrelloDialogView = new ImportTrelloDialogView();

      this.activityView = new cantas.views.ActivityCollectionView({
        // The collection activities is used for other purpose except listening
        // activities event coming from server-side, so just pass the instance
        // of collection instead of saving it as a BoardView instance member.
        collection: this.activityCollection
      });

      this.boardMembersManageView = new cantas.views.BoardMembersManageView({
        collection: this.memberCollection
      });

      // initialize fileupload control which is used to upload json file exported from Trello
      var importTrelloMessage = this.importTrelloDialogView.$('#import-trello-message');
      var importTrelloComplete = this.importTrelloDialogView.$('#import-trello-complete');
      var importTrelloProcessing = this.importTrelloDialogView.$('#import-trello-processing');
      $('#import-trello').fileupload({
        autoUpload: true,
        url: '/import/' + this.model.id,
        acceptFileTypes: /(\.|\/)(json)$/i,
        maxFileSize: 10000000,
        minFileSize: 1,
        dataType: 'json'
      }).on('fileuploadprocessalways', function (e, data) {
        that.importTrelloDialogView.render();
        var file = data.files[0];
        if (file.error) {
          importTrelloMessage.text('Hint: ' + file.error);
          importTrelloProcessing.hide();
          importTrelloComplete.attr('disabled', false).text('Close');
        }
      }).on('fileuploaddone', function (e, data) {
        if (data.result.user_error) {
          importTrelloMessage.text('Error: ' + data.result.user_error);
          importTrelloProcessing.hide();
          importTrelloComplete.attr('disabled', false).text('Close');
          throw new Error(data.result.maintainer_error);
        } else {
          cantas.socket.emit('import-trello-complete', {'boardId': that.model.id});
          importTrelloMessage.text(data.result.success);
          importTrelloProcessing.hide();
          importTrelloComplete.attr('disabled', false).text('Completed');
        }

      }).on('fileuploadfail', function (e, data) {
        importTrelloMessage.text('Error: Importing the json file from Trello failed');
        importTrelloProcessing.hide();
        importTrelloComplete.attr('disabled', false).text('Close');
      }).on('fileuploadsubmit', function (e, data) {
        if (data.files[0].size === 0) {
          importTrelloMessage.text('Hint: Importing the json file from Trello failed');
          importTrelloProcessing.hide();
          return false;
        }
      });

      //render active users
      this.boardActiveUserView = new cantas.views.BoardActiveUserCollectionView({
        collection: this.visitors,
        el: "#sb_memberlist",
        boardId: this.model.id
      });
      this.boardActiveUserView.render();

      //render the vertical scrollbar of the member list
      this.buildScrollbar($("#sb_memberlist"));
      $("#sb_memberlist .scroll-vbar-wrap").hide();
      $("#sb_memberlist").hover(
        function() {
          $(".scroll-vbar-wrap").show();
        },
        function() {
          $(".scroll-vbar-wrap").hide();
        }
      );

      if (!window.cantas.isBoardMember) {
        this.disableEvents();
      }

      var currentUserRole = this.getCurrentUserRole();
      if (currentUserRole !== 'admin') {
        this.$el.find('.js-show-configuration').hide();
      }

      // Load the state of the board view
      // this will open any models, etc.
      this.loadState();

      return this;
    },

    getCurrentUserRole: function() {
      var currentUserRole = null;
      var currentUser = cantas.utils.getCurrentUser();
      this.visitors.each(function(visitor) {
        if (visitor.attributes._id === currentUser.id) {
          currentUserRole = visitor.attributes.role.name;
        }
      });
      return currentUserRole;
    },

    disableEvents: function() {
      this.$el.find('button.js-add-list').hide();
      this.$el.find('a.js-select-private').hide();
      this.$el.find('a.js-toggleInvite').hide();
      this.$el.find('a.js-toggle-board-menu').hide();
      this.$el.find('a.board-info').hide();
      this.$el.undelegate('.board-content', 'dblclick');
      this.boardTitleView.undelegateEvents();
    },

    addAll: function() {
      this.listViewCollection = this.model.listCollection.map(this.addOne, this);
      this.$('#board').append(_.map(this.listViewCollection, this.getListDom, this));
      SORTABLE.refreshListSortable();
      this.switchScrollButton();

      //disable sort function of lists if user is not board member.
      if (!window.cantas.isBoardMember) {
        $('.board').sortable('disable');
      }
    },

    addOne: function(list, collection, options) {
      // `context` is null during initialization(reset),
      // while for manually added list, `context` would be an object.
      var thatListView = new cantas.views.ListView({
        model: list,
        attributes: {
          expandedViewChain: this._expandedViewChain
        }
      });

      if (options && options.add === true) {
        this.listViewCollection.push(thatListView);
        this.$('#board').append(thatListView.render().el);
        SORTABLE.refreshCardSortable();
        $("#board").find(".list-panel:last").addClass("list-panel-highlight");
        setTimeout(function() {
          $("#board")
            .find(".list-panel")
            .filter(".list-panel-highlight")
            .removeClass("list-panel-highlight");
        }, 10);

        // board get scrolled for and only for the list creator.
        // ref: https://bugzilla.redhat.com/show_bug.cgi?id=927501
        // prerequisite: only *one* active session for a single user.
        // note that if one user could get more than one active session, each
        // active connection would also get scrolled; feel free to refine code
        // below if anyone get better idea on distinguishing these clients.
        if (list.attributes.creatorId !== undefined &&
            list.attributes.creatorId === cantas.user.id) {
          var that = this;
          $("#board").animate({
            scrollLeft: $("#board")[0].scrollWidth
          }, 1000, function() {
            that.switchScrollButton();
          });

        }

      } else {
        return thatListView;
      }
    },

    // get list dom
    getListDom: function (view) {
      if (view.model.get('isArchived') === false) {
        return view.render().el;
      }
      return null;
    },

    // Important: here i implement moving fast algorithm,
    // it let list colleciton don't need to update all list's index.
    // only the change list index will be update.(dxiao@redhat.com)
    updateSort: function(event, model, targetPosition, originalPosition) {
      var position = Number(targetPosition);
      var originPosition = Number(originalPosition);
      var thatModel = model; // this model this list Model
      var listCollection = this.model.listCollection; // this.model is board Model
      var listCount = listCollection.length;
      var listOrder = -1;
      var beforeIndex = 0;
      var afterIndex = 0;

      // list reorder rule apply
      //case 1:move to first position
      if (position === 0) {
        var firstIndex = listCollection.at(position).get('order');
        listOrder = (firstIndex - 1) / 2;
      }

      //case 2: moving to inPositions, from left to right
      if (originPosition < position && position > 0 && position < listCount - 1) {
        beforeIndex = listCollection.at(position).get('order');
        afterIndex = listCollection.at(position + 1).get('order');
        listOrder = (beforeIndex + afterIndex) / 2;
      }

      //case 2: moving to inPositions, from right to left
      if (originPosition > position && position > 0 && position < listCount - 1) {
        beforeIndex = listCollection.at(position - 1).get('order');
        afterIndex = listCollection.at(position).get('order');
        listOrder = (beforeIndex + afterIndex) / 2;
      }

      //case 3: move to last index of list array
      if (position === listCount - 1) {
        var lastIndex = listCollection.at(listCount - 1).get('order');
        listOrder = lastIndex + 65536;
      }

      // list model update
      model.set({'order': listOrder}, {silent: true});
      // trigger
      model.patch({'order': listOrder}, {validate: false});
      // update board model.listCollection, and trigger the model
      listCollection.add(model, {merge: true, silent: true});
      listCollection.sort({silent: true}); // update sort.
      this.model.listCollection = listCollection; // assign to origin listCollection

      //refresh positions
      SORTABLE.refreshListSortable();
      SORTABLE.refreshCardSortable();
    },

    /*
     * Collapse previous edit control area.
     */
    collapsePreviousEdit: function() {
      var view = this._expandedViewChain.pop();
      if (view !== undefined) {
        view.collapse();
      }
    },

    bodyClicked: function(event) {
      // Currently, there is only one task to do.
      event.data.collapsePreviousEdit();
    },

    toggleVisibility: function(event) {

      event.preventDefault();
      event.stopPropagation();
      if ($(event.target).hasClass("active")) {
        $(event.target).removeClass("active").attr("title", "Set to private");
      } else {
        $(event.target).addClass("active").attr("title", "Set to public");
      }
      var visibility = this.model.get("isPublic") === true ? false : true;
      var origin_isPublic = this.model.get("isPublic");
      this.model.patch({
        "isPublic": visibility,
        original: {isPublic: origin_isPublic}
      }, {silent: true, validate: true});
    },

    resetVisibility: function() {
      var visibility = this.model.get("isPublic");
      if (visibility) {
        this.$el.find("a.js-select-private").removeClass("active").attr("title", "Set to private");
      } else {
        this.$el.find("a.js-select-private").addClass("active").attr("title", "Set to public");
      }
    },

    toggleInviteMember: function(event) {

      if ($(".activity:visible").length === 1) {
        $(".activity").hide();
      }
      if (this.$el.find(".invite:visible").length === 1) {
        this.$el.find(".invite").hide("slide", { direction: "right" }, "fast");
      } else {
        this.$el.find(".invite").show("slide", { direction: "right" }, "fast");
        this.$el.find(".invite-new .input-member").focus();
      }
    },

    scrollBoardContent: function(event) {

      this.flag_continueScrollBoard = false;
      clearInterval(this.timer_continueScrollBoard);

      var offset = ($(event.target).parent().is(".js-board-side-scroll-left")) ? -278 : 278;
      var that = this;
      $("#board").stop().animate({"scrollLeft": $("#board").scrollLeft() + offset}, 300,
        function() {
          that.switchScrollButton();
        });
    },

    switchScrollButton: function() {
      if ($("#board")[0].scrollWidth - $("#board").innerWidth() > 0) {
        if ($("#board").scrollLeft() === 0) {
          this.$el.find(".js-board-side-scroll-left").hide();
          if (this.$el.find(".js-board-side-scroll-right").is(":hidden")) {
            this.$el.find(".js-board-side-scroll-right").show();
          }
        } else if (
          $("#board").scrollLeft() + $("#board").innerWidth() === $("#board")[0].scrollWidth
        ) {
          this.$el.find(".js-board-side-scroll-right").hide();
          if (this.$el.find(".js-board-side-scroll-left").is(":hidden")) {
            this.$el.find(".js-board-side-scroll-left").show();
          }
        } else {
          if (this.$el.find("div[class*='js-board-side-scroll']").is(":hidden")) {
            this.$el.find("div[class*='js-board-side-scroll']").show();
          }
        }
      } else {
        this.$el.find("div[class*='js-board-side-scroll']").hide();
      }
    },

    startScrollBoardContent: function(event) {

      var that = this;
      this.timer_continueScrollBoard = setTimeout(function() {
        that.flag_continueScrollBoard = true;
      }, 200);

      var offset = ($(event.target).parent().is(".js-board-side-scroll-left")) ? -50 : 50;
      this.timer_scrollBoard = setInterval(function() {
        if (that.flag_continueScrollBoard) {
          $("#board").stop().animate({"scrollLeft": $("#board").scrollLeft() + offset},
            50);
        }
      }, 50);
    },

    stopScrollBoardContent: function(event) {

      this.flag_continueScrollBoard = false;
      clearInterval(this.timer_continueScrollBoard);
      clearInterval(this.timer_scrollBoard);
    },
    /*
     * Implememtation Idea: the height of the scrollbar represents that of the difference between
     * the scroll content and the scroll pane. When users slide the handle of the scrollbar,
     * the program is resposible for modifying the top attribute of the tag including the scrll 
     * content. As a result, users can see the different fragments of the content in a small area 
     * by means of scrollbar.
     */
    buildScrollbar: function (jScrollbar) {
      //build up the architecture of the scroll content
      jScrollbar.css("overflow", "hidden");
      if (jScrollbar.find(".scroll-content").length === 0) {
        jScrollbar.children().wrapAll('<div class="scroll-content"></div>');
      }
      //compute the difference between the height of the scroll content and that of the scroll pane
      //to decide if we need to display a vertical scrollbar now
      var iDifference = jScrollbar.find(".scroll-content").height() - jScrollbar.height();
      jScrollbar.data("difference", iDifference);
      //don't need a scrollbar
      if (iDifference <= 0 && jScrollbar.find(".scroll-vbar-wrap").length > 0) {
        jScrollbar.find(".scroll-vbar-wrap").remove();
        jScrollbar.find(".scroll-content").css({top: 0});
      }

      //need a scrollbar
      if (iDifference > 0) {
        //build up the architecture of the scroll bar
        var iScrollbarInitVal = (1 - Math.abs(
          jScrollbar.find(".scroll-content").position().top
        ) / iDifference) * 100;
        if (jScrollbar.find(".scroll-vbar-wrap").length === 0) {
          jScrollbar.append('<div class="scroll-vbar-wrap"><div class="scroll-vbar"></div></div>');
          iScrollbarInitVal = 100;
        }
        jScrollbar.find(".scroll-vbar-wrap").height(jScrollbar.height());

        //initialize the vertical scrollbar
        jScrollbar.find(".scroll-vbar").slider({
          orientation: "vertical",
          min: 0,
          max: 100,
          value: iScrollbarInitVal,
          //triggered on user moves slider with mouse drag or mouse click
          slide: function(event, ui) {
            jScrollbar.find(".scroll-content").css({top: -((100 - ui.value) / 100 * iDifference)});
          },
          //triggered on user moves slider with mouse wheel or resizes the window
          //(whenever the value of the slider has changed)
          change: function(event, ui) {
            jScrollbar.find(".scroll-content")
              .css({
                top: -(
                  (100 - ui.value) / 100 * (
                    jScrollbar.find('.scroll-content').height() - jScrollbar.height()
                  )
                )
              });
          }
        });
        //correct the layout attributes of the scroollbar and its handle
        var iHandleHeight = Math.round(
          jScrollbar.height() / jScrollbar.find(".scroll-content").height() * jScrollbar.height()
        );
        jScrollbar.find(".ui-slider-handle")
          .css({"height": iHandleHeight, "margin-bottom": -0.5 * iHandleHeight});
        jScrollbar.find(".scroll-vbar")
          .css({"height": jScrollbar.height() - iHandleHeight, "margin-top": iHandleHeight * 0.5});
      }

      //event handler for clicks on the scrollbar outside the handle         
      $(".scroll-vbar-wrap").click(function(event) {
        $(this).find(".scroll-vbar")
          .slider("value", 100 - (event.pageY - $(this).offset().top) / $(this).height() * 100);
      });

      //event handler for mousewheel
      if ($.fn.mousewheel) {
        jScrollbar.on("mousewheel", function(event, delta) {
          //calculate the subtlety of the wheel scroll
          var iSubtlety = Math.round(5000 / jScrollbar.data("difference"));
          if (iSubtlety < 1) {
            iSubtlety = 1;
          }
          if (iSubtlety > 100) {
            iSubtlety = 100;
          }
          var iScrollbarVal = $(this).find(".scroll-vbar").slider("value");
          $(this).find(".scroll-vbar").slider("value", iScrollbarVal + delta * iSubtlety);

          event.preventDefault();
        });
      }
    },

    closeBoardClicked: function(event) {
      $('.js-toggle-board-menu').trigger('click');
      if (confirm("Are you sure to close this board?")) {
        this.model.off("change:isClosed");
        this.model.patch({isClosed: true});
        cantas.appRouter.navigate("boards/closed", {
          trigger: true,
          replace: true
        });
      }
    },

    onBoardClosed: function() {
      var currentUser = cantas.utils.getCurrentUser();
      if (this.model.get("creatorId") !== currentUser.id && this.model.attributes.isClosed) {
        var dialog = $(".force-alert");
        dialog.find("p")
          .text("This board is closed by board creator." +
                " Any further operation, please contact the creator.");
        dialog.find("a")
          .attr("href", "/boards/mine")
          .text("Please go to home page!");
        dialog.modal({backdrop: 'static'});
      }
    }
  });

}(jQuery, _, Backbone));
