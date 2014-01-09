(function ($, _, Backbone) {

  "use strict";

  cantas.views.MoveItemView = Backbone.View.extend({
    tagName: 'li',
    template: jade.compile($("#template-move-list-item").text()),

    initialize: function(data) {
      _.bindAll(this, "render");
    },

    events: {
      "click a": "checkedItem"
    },

    checkedItem: function(event) {
      $(event.target).parent('li').addClass('checked').siblings('li').removeClass('checked');
    },

    render: function() {
      this.$el.html(this.template({
        data: this.model
      }));
      return this;
    }
  });

  cantas.views.MoveListToView = Backbone.View.extend({
    el: "div.window-overlay",
    template: jade.compile($("#template-move-list").text()),

    initialize: function(data) {
      _.bindAll(this, "render");
      this.boardId = data.boardId;
      this.listId = data.listId;
      this.title = data.title;
      this.boardCollection = new cantas.models.BoardCollection();
      this.listCollection = new cantas.models.ListCollection();
      this.boardMemberCollection = new cantas.models.BoardMemberCollection();
      this.syncconfigCollection = new cantas.models.SyncConfigCollection();
    },

    _childrenViews: [],

    events: {
      "hidden.bs.modal": "closeWindowOverlay",
      "keyup .js-move-search": "moveSearch",
      "click .js-set-position": "setPosition",
      "click .js-move": "onMoveListClick",
      "click .choose-position > ul:eq(0) .js-move-items li.checked": "updatePositionSelection"
    },

    updatePositionSelection: function(event) {
      var boardId = $(event.target).data('itemid');
      this.updateListPosition(boardId);
    },

    updateListPosition: function(boardId) {
      var _this = this;
      var checkedItemPath = '.choose-position li.specific a';
      var positionItemsPath = '.choose-position .js-move-position';
      var checkedPositionPath = 'a[data-itemid*="' + _this.listId + '"]';
      this.$el.find(checkedItemPath).removeClass('checked');
      this.listCollection.fetch({
        data: {
          boardId: boardId,
          isArchived: false
        },
        success: function(lists, response, options) {
          _this.$el.find(positionItemsPath).empty();
          lists.each(function(list) {
            var itemView = new cantas.views.MoveItemView({
              model: {
                "_id": list.id,
                "title": lists.indexOf(list) + 1
              }
            });
            _this._childrenViews.push(itemView);
            _this.$el.find(positionItemsPath).append(itemView.render().el);
          });
          _this.$el.find(checkedPositionPath).parent('li').addClass('checked');
        }
      });
    },

    updateBoardList: function() {
      var tabIndex = 0;
      cantas.utils.renderMoveList(this, this.boardId, null, tabIndex);
    },

    onMoveListClick: function(event) {
      var targetBoardId = this.$el
        .find('.choose-position > ul:eq(0) .js-move-items li.checked a').data("itemid");
      var originalBoardId = this.boardId;
      if (originalBoardId !== targetBoardId && this.syncconfigCollection.length > 0) {
        var currentBoardView = cantas.utils.getCurrentBoardView();
        if (currentBoardView && !currentBoardView.confirmDialogView) {
          currentBoardView.confirmDialogView = new cantas.views.ConfirmDialogView();
        }
        this.confirmMoveListToOtherBoard(event);
      } else {
        this.moveAction(event);
      }
    },

    confirmMoveListToOtherBoard: function(event) {
      event.stopPropagation();

      $("body").click();

      var self = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "move",
        operationItem: "list",
        confirmInfo: 'Are you sure to move this list containing a mapping relation to the Bugzilla?'
          + ' If you do that, we will use another the same name of list'
          + '(a existing list, or created one) for the coming sync bugs from Bugzilla.',
        captionYes: "Yes",
        yesCallback: function() {
          self.moveAction();
          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        diplayNoAskOrNo: false,
        pageX: event.pageX,
        pageY: event.pageY - 200,
        width: 360
      });
    },

    moveAction: function(event) {
      var listId = this.listId;
      var boardId = this.$el
        .find('.choose-position > ul:eq(0) .js-move-items li.checked a').data("itemid");
      var position = this.$el.find('.choose-position .js-move-position li.checked a').data('label');
      var moveData = {
        "boardId": boardId,
        "listId": listId,
        "position": position
      };

      cantas.socket.emit("move-list", moveData);
      this.$el.modal('hide');
    },

    setPosition: function(event) {
      var position = $(event.target).data("position");
      $(event.target).addClass('checked').siblings('a').removeClass('checked');
      this.movePositionShortcut(position);
    },

    movePositionShortcut: function(position) {
      if (position === 'top') {
        this.moveTop();
      }
      if (position === 'middle') {
        this.moveMiddle();
      }
      if (position === 'bottom') {
        this.moveBottom();
      }
    },

    moveTop: function() {
      var targetEl = this.$el.find('.choose-position .js-move-position li:first');
      this.highlightBox(targetEl);
      this.$('.js-move-position').scrollTop(0);
    },

    moveMiddle: function() {
      var middle = Math.ceil($(".choose-position .js-move-position li").length / 2) - 1;
      var targetEl = this.$el.find('.choose-position .js-move-position li:eq(' + middle + ')');
      this.highlightBox(targetEl);
    },

    moveBottom: function() {
      var targetEl = this.$el.find('.choose-position .js-move-position li:last');
      this.highlightBox(targetEl);
      var movePositionColumn = this.$('.js-move-position')[0];
      $(movePositionColumn).scrollTop(movePositionColumn.scrollHeight);
    },

    highlightBox: function(targetEl) {
      targetEl.addClass('checked').siblings('li').removeClass('checked');
    },

    moveSearch: function(event) {
      cantas.utils.renderMoveSearch(event);
    },

    render: function() {
      var that = this;
      this.$el.html(this.template({data: {title: that.title}}));
      //hide list and position list
      that.$el.find('.choose-position > ul:eq(1)').hide();
      this.$el.modal();

      var boardId = that.boardId;
      //render boardCollection
      this.updateBoardList();
      //render list position
      this.updateListPosition(this.boardId);
      this.syncconfigCollection.fetch({ data: { listId: this.listId } });

      return this;
    },

    remove: function() {
      this.closeWindowOverlay();
      return this;
    },

    closeWindowOverlay: function() {
      var childrenViews = this._childrenViews;
      _.each(childrenViews, function(view) {
        view.remove();
        childrenViews.pop(view);
      });

      this.undelegateEvents();
      this.stopListening();
      this.$el.empty();
    }

  });

  cantas.views.ListView = Backbone.View.extend({
    tagName: "div",

    className: "list-panel js-list-panel",

    template: jade.compile($("#template-list-view").text()),

    events: {
      "click .js-list-setting": "showListMenu",
      "mouseenter header.list-header": "showListSettingIcon",
      "mouseleave header.list-header": "hideListSettingIcon",
      "click .js-list-title-text":    "editListTitle",
      "click .js-add-card":      "showAddForm",
      "click .js-cancel":        "hideAddForm",
      "click .js-btn-submit":    "createCard",
      "input #card-form": "autoResizeTextArea",
      "dblclick":                "onDoubleClick",

      //List reorder Event
      "listdrop": "listDrop",
      //Card reorder event
      "sortstop": "sortStop",
      "sortreceive": "sortReceive",
      "click header": "headerClicked"
    },

    initialize: function () {
      this._fetchCards();
      this.model.on('change:title', this.titleChanged, this);
      this.model.on('change:isArchived', this.isArchivedChanged, this);
      this.model.on('change:order', this.refreshListOrder, this);
      this.model.on('remove', this.remove, this);
      this.model.cardCollection.on('add', this.onCardAddedToCollection, this);
      this.model.cardCollection.on('remove', this.onCardRemovedFromCollection, this);
      this.model.cardCollection.on('reset', this.addAll, this);
      this.model.cardCollection.on('add', this.updateCardQuantity, this);
      this.model.cardCollection.on('remove', this.updateCardQuantity, this);
      this.model.cardCollection.on('reset', this.updateCardQuantity, this);
      this.model.cardCollection.on('change:isArchived', this.updateCardQuantity, this);
      this.model.cardCollection.on('change:isArchived', this.addAll, this);

      this.cardViewCache = {};
    },

    _fetchCards: function() {
      var listId = this.model.id;
      this.model.cardCollection.fetch({
        data: {listId: listId},
        reset: true
      });
    },

    updateCardQuantity: function(data) {
      if (this.model.get("isArchived") === false) {
        var cardQuantity = this.model.cardCollection.where({isArchived: false}).length;
        this.$el.find(".js-card-quantity").html(cardQuantity);
      }
    },

    updateCardsOrderNumber: function() {
      this.$el.find(".order-number").each(function(index, elem) {
        elem.textContent = index + 1;
      });
    },

    remove: function() {
      if (this.listMenuView) {
        this.listMenuView.remove();
      }

      _.each(this.cardViewCache, function(cardView) {
        cardView.close();
      });

      this.undelegateEvents();
      this.stopListening();
      this.$el.remove();
      this.model.dispose();
      return this;
    },

    render: function () {
      var el = this.$el.empty();
      // dynamically append `listId` in each of the list
      var listId = this.model.id;
      el.attr('id', listId);
      el.append(this.template(this.model.toJSON()));
      // FIXME: window.innerHeight most fits our need. while it is not
      // accessable until after page finishes loads, besides, the height
      // should be refreshed when window is resized.
      el.find(".list-content").css('max-height', ($("#board").height() - 90));

      // append all cards
      this.renderCards();

      if (!window.cantas.isBoardMember) {
        this.$el.find('.js-add-card').hide();
        this.undelegateEvents();
      }

      return this;
    },

    // render rest of cards view
    renderCards: function() {
      var that = this;
      if (!that.model.cardCollection) {
        return that;
      }
      that.model.cardCollection.each(function(card) {
        _.each(that.cardViewCache, function(cardView) {
          if (cardView.model.id === card.id) {
            that.$(".list-content").append(cardView.render().el);
            cardView.delegateEvents();
          }
        });
      });
      return that;
    },

    onCardAddedToCollection: function(card, collection, options) {
      var index = collection.where({isArchived: false}).length;
      this.addOne(card, index, collection);
    },

    onCardRemovedFromCollection: function(card) {
      var cardIdsCache = {};
      _.each(this.cardViewCache, function(cardView) {
        cardIdsCache[cardView.model.id] = cardView.cid;
      });
      var cardViewCid = cardIdsCache[card.id];
      if (cardViewCid) {
        this.cardViewCache[cardViewCid].close();
        delete this.cardViewCache[cardViewCid];
      }
    },

    addAll: function() {
      var that = this;
      var index = 0;
      this.model.cardCollection.forEach(function (card) {
        if (card.get("isArchived") === false) {
          index += 1;
        }
        that.addOne(card, index);
      });
      SORTABLE.refreshCardSortable();
      //disable sort function of cards when user is not board member.
      if (!window.cantas.isBoardMember) {
        $('.connectedSortable').sortable('disable');
      }
    },

    addOne: function(card, index, context) {
      var _expandedViewChain = cantas.utils.getCurrentBoardView()._expandedViewChain;
      var cardIdsCache = {};
      _.each(this.cardViewCache, function(cardView) {
        cardIdsCache[cardView.model.id] = cardView.cid;
      });
      var cardViewCid = cardIdsCache[card.id];
      var thatCardView = null;
      if (!cardViewCid) {
        thatCardView = new cantas.views.CardView({
          model: card,
          attributes: {
            index: index,
            expandedViewChain: _expandedViewChain
          }
        });
        var uniqueId = thatCardView.cid;
        this.cardViewCache[uniqueId] = thatCardView;
      } else {
        thatCardView = this.cardViewCache[cardViewCid];
        thatCardView.attributes.index = index;
      }

      // only render not archived cards
      if (card.get("isArchived") === false) {
        var addCardArea = this.$('.js-add-card-area');
        if (addCardArea.length > 0) {
          thatCardView.render().$el.insertBefore(addCardArea);
        } else {
          this.$('.list-content').append(thatCardView.render().el);
        }

        thatCardView.$el.show();
      }

      if (context) {
        SORTABLE.refreshCardSortable();
        this.$('.card:last').addClass('card-highlight');
        setTimeout(function() {
          this.$('.card.card-highlight').removeClass('card-highlight');
        }, 10);

        if (card.attributes.creatorId !== undefined &&
            card.attributes.creatorId === cantas.user.id) {
          this.$el.find(".js-list-content").animate({
            scrollTop: this.$el.find(".js-list-content")[0].scrollHeight + 1000
          }, 500);
        }
      }
    },

    showListMenu: function (event) {
      event.stopPropagation();

      if (!this.listMenuView) {
        this.listMenuView = new cantas.views.ListMenuView();
      }

      $("body").click();

      var offsetX = 0;
      if (event.pageX + $("#list-menu").width() > $(window).width()) {
        offsetX = event.pageX + $("#list-menu").width() - $(window).width();
      }

      this.listMenuView.render({
        listId: this.model.id,
        boardId: this.boardId,
        pageX: event.pageX - offsetX,
        pageY: event.pageY
      });

      $(event.target).show();

      this.attributes.expandedViewChain = cantas.utils.rememberMe(
        this,
        this.attributes.expandedViewChain
      );
    },

    showListSettingIcon: function (event) {

      this.$el.find(".js-list-setting").show();
    },

    hideListSettingIcon: function (event) {
      if ($("#list-menu").is(":hidden") || this.el.id !== $("#list-menu").attr("data-listId")) {
        this.$el.find(".js-list-setting").hide();
      }
    },

    isArchivedChanged: function(data) {
      var that = this;

      if (data.get('isArchived') === true) {
        // list archived
        $(that.el).fadeOut('slow', function() {
          that.$el.hide();
          cantas.utils.getCurrentBoardView().switchScrollButton();
        });
      } else {
        // list unarchived
        $('#board').append(this.render().el);
        this.$el.show();
        this._fetchCards();
      }

      //refresh sortable index
      SORTABLE.refreshListSortable();
      SORTABLE.refreshCardSortable();
    },

    editListTitle: function (event) {
      event.stopPropagation();

      this.editAreaContainer = $(event.target).parent();
      var placeholder = $(event.target).text();
      this.restoreHTML = this.editAreaContainer.html();
      var cloneQuanlity = this.editAreaContainer.find('span.js-card-quantity').clone().hide();
      this.editAreaContainer.html($("#list-title-edit-placeholder").html());
      this.editAreaContainer.find('div.edit-title').append(cloneQuanlity);
      this.editAreaContainer.find("#title-input")
        .on("keypress", this, this.titleInputKeypressed)
        .val(this.model.get("title"))
        .focus()
        .select();

      // FIXME: bind event in view's events attribute.
      this.editAreaContainer.find(".js-save-list-title").on("click", this, this.saveListTitle);

      this.attributes.expandedViewChain = cantas.utils.rememberMe(
        this,
        this.attributes.expandedViewChain
      );
    },

    saveListTitle: function(event) {
      var view = event.data;
      var title = view.editAreaContainer.find("#title-input").val().trim();
      if (title.length === 0) {
        alert("Please enter a list title");
      } else {
        var origin_title = view.model.get('title');
        var result = view.model.set({ "title": title },
                                    { validate: true });
        if (view.model.hasChanged("title")) {
          $("body").trigger("click");
          view.model.patch({
            title: title,
            original: {title: origin_title}
          });
        }
      }
      return true;
    },

    titleInputKeypressed: function(event) {
      if (event.which === 13) {
        $(event.target).parent().find(".js-save-list-title").trigger("click");
      }
    },

    titleChanged: function(data) {
      var title = data.get("title");
      $(this.el).find(".js-list-title-text").text(title).attr("title", title);
    },

    collapse: function() {
      if (this.editAreaContainer) {
        this.editAreaContainer.find(".js-save-list-title").off("click", this, this.saveListTitle);
        this.editAreaContainer.html(this.restoreHTML.replace(
          /\d+<\/span>$/,
          this.editAreaContainer.find('span.js-card-quantity').text()
        ));
        this.editAreaContainer.find(".js-list-title-text").text(this.model.get('title'));
      }

      if (this.listMenuView) {
        this.listMenuView.undelegateEvents();
      }

      //close other expanded view
      this.attributes.expandedViewChain = cantas.utils.forgetMe(
        this,
        this.attributes.expandedViewChain
      );
    },

    /*
     * Default behavior. When it is necessary to trigger document's click event,
     *  do it explicitly just like in saveListTitle.
     */
    headerClicked: function(event) {
      event.stopPropagation();
    },

    showAddForm: function (event) {
      event.preventDefault();
      event.stopPropagation();
      $(".hidden-option").remove();
      $(".js-add-card").show();
      var addCardTemplate = jade.compile($("#template-card-add-view").text());
      var container = this.$el.find(".list-content");
      container.append(addCardTemplate());
      container.animate({scrollTop: container[0].scrollHeight}, 100);
      $("#card-form").select();
      this.$el.find(".js-add-card").hide();
    },

    autoResizeTextArea: function (event) {
      $(event.target).height(0);
      $(event.target).height($(event.target)[0].scrollHeight);
      this.$el
        .find(".js-list-content")
        .scrollTop(this.$el.find(".js-list-content")[0].scrollHeight);
    },

    hideAddForm: function (event) {
      event.preventDefault();
      $(event.target).closest('.hidden-option').remove();
      this.$el.find(".js-add-card").show();
    },

    createCard: function (event) {
      event.preventDefault();
      // FIXME: `card title` is mandatory field, add data validation for user input.
      var title = $(event.target).closest('.hidden-option').find('textarea').val().trim();
      if (title) {
        var newCard = new cantas.models.Card({
          title: title,
          creatorId: cantas.user.id,
          listId: this.model.id,
          boardId: this.model.get('boardId'),
          order: this.calcPos()
        });
        newCard.save();
        this.hideAddForm(event);
      } else {
        return false;
      }
    },

    listDrop: function(event, newIndex, oldIndex) {
      //Only the position have changed,the trigger will fire!
      if (newIndex !== oldIndex) {
        this.$el.trigger('updatesort', [this.model, newIndex, oldIndex]);
      }
    },

    // Disable event propagation inside ListView by overwriting `dblclick`.
    // Pros: a few lines of code, easy to add.
    // Cons: disable propagation requires additional efforts.
    onDoubleClick: function (event) {
      event.stopPropagation();
      return true;
    },

    // When order update, the order will reset by UI select
    refreshListOrder: function(model) {
      var listItems = $('#board').find('.list-panel');
      var oldIndex = listItems.index(this.$el);
      var listCollection = cantas.utils.getCurrentBoardModel().listCollection;
      //in this board view, the list colleciton also need sort list colleciton.
      listCollection.sort({silent: true});
      var sortArray = listCollection.pluck('order');
      var newIndex = _.indexOf(sortArray, model.get('order'), true);

      // we know here, the model change is duplicate trigger in original model context.
      // the views already changed in this views, we don't need update everything.
      // only other client need update the views list order
      if (newIndex > oldIndex) {
        $(this.el).parent()
          .children().eq(newIndex).after($(this.el));
      }
      if (newIndex < oldIndex) {
        $(this.el).parent()
          .children().eq(newIndex).before($(this.el));
      }
      //refresh positions
      SORTABLE.refreshListSortable();
      SORTABLE.refreshCardSortable();
      // reset list edit mode to normal model
      $("body").trigger("click");
    },

    //Card reorder event
    sortStop: function(event, ui) {
      event.stopPropagation();
      this.triggerOnItem(event, ui, "movefrom");
    },

    sortReceive: function (event, ui) {
      event.stopPropagation();
      this.triggerOnItem(event, ui, "movein");
    },

    // card moving private methods, it will trigger card view event.
    triggerOnItem: function (event, ui, tag) {
      var thatView = this;
      _.defer(function () {
        return ui.item.trigger(tag, [ ui, thatView ]);
      });
    },

    //card calcPos
    calcPos: function() {
      var cardOrder = -1;
      var activeCardArray = this.model.cardCollection.where({isArchived: false});
      activeCardArray = activeCardArray.sort(function(a, b) {
        return (a - b);
      });
      var cardCount = activeCardArray.length;
      if (cardCount === 0) {
        cardOrder = cardOrder + 65536;
      }
      if (cardCount > 0) {
        var lastOrder = _.last(activeCardArray).get('order');
        cardOrder = lastOrder + 65536;
      }
      return cardOrder;
    }

  });

  cantas.views.ListMenuView = Backbone.View.extend({
    el: "div#list-menu",

    events: {
      "click .close": "hideListMenu",
      "click .js-add-card": "addCard",
      "click .js-archive-list": "archiveList",
      "click .js-archive-all-cards": "archiveAllCards",
      "click .js-move-list": "moveList"
    },

    initialize: function () {
      _.bindAll(this, "render", "moveList");

      //when clicking outside area of the list-menu, it will disappear.
      $("body").on("click", function (event) {
        $(".list-menu,.js-list-setting").hide();
      });
    },

    render: function (context) {
      this.boardId = cantas.utils.getCurrentBoardId();
      this.listId = context.listId;
      this.$el.attr("data-listId", this.listId);
      this.$el.css({"left": context.pageX, "top": context.pageY});

      this.delegateEvents();
      this.$el.toggle();
      return this;
    },

    _getListModel: function() {
      return cantas.utils.getCurrentBoardModel().listCollection.findWhere({_id: this.listId});
    },

    addCard: function(event) {
      this.hideListMenu(event);
      $("#" + this.listId + ".list-panel").find(".js-add-card").trigger("click");
    },

    archiveList: function (event) {
      this.hideListMenu(event);
      var list = this._getListModel();
      list.patch({
        isArchived: true,
        original: {isArchived: false}
      });
    },

    archiveAllCards: function(event) {
      this.hideListMenu(event);
      var list = this._getListModel();
      list.patch({_archiveAllCards: true});
    },

    moveList: function(event) {
      this.hideListMenu(event);
      this.moveListToView = new cantas.views.MoveListToView({
        title: 'Move List',
        listId: this.listId,
        boardId: this.boardId
      });
      this.moveListToView.render();
    },

    hideListMenu: function(event) {
      event.stopPropagation();
      this.undelegateEvents();
      this.$el.hide();
    },

    remove: function() {
      if (this.moveListToView) {
        this.moveListToView.remove();
      }
      this.undelegateEvents();
      this.stopListening();
      return this;
    }

  });

}(jQuery, _, Backbone));
