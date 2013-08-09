// Card Item View
// --------------

$(function ($, _, Backbone) {

  cantas.views.EntryView = Backbone.View.extend({
    tagName: "div",
    className: "card-option-edit show",

    defaults: {
      // The text to show in the shadown
      placeholder: "",

      /*
       * If accept Enter key, EntryView becomes a multiple line entry.
       * Otherwise, the confirm button will be triggered when enter key is
       * pressed.
       */
      acceptEnterKey: false,

      acceptEscKey: true
    },

    events: {
      "keypress": "onViewKeypress",
      "click .js-entryview-confirm": "onButtonConfirmClick",
      "click .js-entryview-cancel": "onButtonCancelClick",
      "keypress textarea": "onInputKeypress"
    },

    initialize: function(options) {
      var _options = options || {};

      /*
       * Store custom event handlers and the data provided by caller.
       */
      this._eventHandlers = {};

      // A standalone function to handle these options is better. Let's do it asap.
      var placeholder = _options.placeholder;
      if (placeholder !== undefined && typeof placeholder === "string")
        this.defaults.placeholder = placeholder;

      var acceptEscKey = _options.acceptEscKey;
      if (acceptEscKey !== undefined && typeof acceptEscKey === "boolean")
        this.defautls.acceptEscKey = acceptEscKey;

      var acceptEnterKey = _options.acceptEnterKey;
      if (acceptEnterKey !== undefined && typeof acceptEnterKey === "boolean")
        this.defautls.acceptEnterKey = acceptEnterKey;

      var buttons = _options.buttons;
      if (buttons !== undefined)
        this._handleCustomButtons(buttons);
    },

    /*
     * Get the text input by user.
     */
    getText: function() {
      return this.$el.find("textarea").val();
    },

    focus: function() {
      this.$el.find("textarea").focus();
    },

    /*
     * Trigger specific button's click event.
     *
     * Arguments:
     * - name: required, a string representing the action name.
     */
    trigger: function(name) {
      var classSelector = ".js-entryview-" + name;
      this.$el.find(classSelector).trigger("click");
    },

    render: function() {
      var data = this.defaults;
      var template = _.template(this._templateContent());
      this.$el.html(template(data));
      return this;
    },

    _getEventHandler: function(handlerName) {
      return this._eventHandlers[handlerName];
    },

    _templateContent: function() {
      return "<textarea placeholder=\"<%= placeholder %>\"></textarea>" +
        "<button class=\"btn btn-primary js-entryview-confirm\">Save</button>" +
        "<button class=\"btn js-entryview-cancel\">Cancel</button>" +
        "<div class=\"item-time\"><div class=\"js-create-time\"></div>" +
        "<div class=\"js-modify-time\"></div></div>";
    },

    _handleCustomButtons: function(buttons) {
      for (var i = buttons.length - 1; i >= 0; i--) {
        var button = buttons[i];
        if (button.eventHandler && typeof button.eventHandler === "function") {
          var data = button.data || {};
          data.entryView = this;
          this._eventHandlers[button.name] = {
            "function": button.eventHandler, "data": data
          };
        }
      }
    },

    _callHandler: function(handlerName, event) {
      var handler = this._getEventHandler(handlerName);
      if (handler === undefined) {
        console.log("EntryView:" + handlerName + ":Not implemented.");
      } else {
        handler.function(event, handler.data);
      }
    },

    onButtonConfirmClick: function(event) {
      this._callHandler("confirm", event);
    },

    onButtonCancelClick: function(event) {
      this._callHandler("cancel", event);
    },

    onInputKeypress: function(event) {
      var ENTER_KEYCODE = 13;
      if (event.which === ENTER_KEYCODE && !this.defaults.acceptEnterKey) {
        this.$el.find(".js-entryview-confirm").trigger("click");
        return false;
      }
    },

    onViewKeypress: function(event) {
      var doCancelWhenESC = event.keyCode === $.ui.keyCode.ESCAPE &&
                            this.defaults.acceptEscKey;
      if (doCancelWhenESC) {
        this.$el.find(".js-entryview-cancel").trigger("click");
        return false;
      }
    }
  });

  /*** End of EntryView ***/

  /**
   *  MoveCardToView
   **/
  window.cantas.MoveCardToView = Backbone.View.extend({
    el: 'div.window-overlay',
    template: jade.compile($('#template-move-list').text()),
    initialize: function(data){
      _.bindAll(this,'render');

      this.boardId = cantas.utils.getCurrentBoardId();
      this.listId = data.listId;
      this.title = data.title;
      this.cardId = data.cardId;
      this.boardCollection = new cantas.models.BoardCollection();
      this.listCollection = new cantas.models.ListCollection();
      this.cardColleciton = new cantas.models.CardCollection();
      this.boardMemberCollection = new cantas.models.BoardMemberCollection();
    },
    
    _childrenViews: [],
    events: {
      "hidden": "closeWindowOverlay",
      "keyup .js-move-search": "moveSearch",
      "click .js-set-position": "setPosition",
      "click .choose-position > ul:eq(0) .js-move-items li.checked": "updateCheckedList",
      "click .choose-position > ul:eq(1) .js-move-items li.checked": "renderCardPosition",
      "click .js-move": "moveAction"
    },

    render: function() {
      this.$el.html(this.template({data: {title: this.title}}));
      this.$el.modal();

      var tabs = ['board','list'];
      this.updateMoveList(tabs);
      this.updateCardPosition(this.listId)
    },

    setPosition: function(event){
      var position = $(event.target).data("position");
      $(event.target).addClass('checked').siblings('a').removeClass('checked');
      this._movePositionShortcut(position);
    },

    _movePositionShortcut: function(position){
      if( position === 'top' ){
        this._moveTop();
      } else if( position === 'middle' ){
        this._moveMiddle();
      } else if( position === 'bottom' ){
        this._moveBottom();
      }
    },

    _moveTop: function(){
      var targetEl = this.$el.find('.choose-position .js-move-position li:first');
      this._highlightBox(targetEl);
    },

    _moveMiddle: function(){
      var middle = Math.ceil($(".choose-position .js-move-position li").length / 2) - 1;
      var targetEl = this.$el.find('.choose-position .js-move-position li:eq('+middle+')');
      this._highlightBox(targetEl);
    },

    _moveBottom: function(){
      var targetEl = this.$el.find('.choose-position .js-move-position li:last');
      this._highlightBox(targetEl);
    },

    _highlightBox: function(targetEl){
      targetEl.addClass('checked').siblings('li').removeClass('checked');
    },

    moveAction: function(event){
      var boardId = this.$el.find('.choose-position > ul:eq(0) .js-move-items li.checked a').data("itemid");
      var listId = this.$el.find('.choose-position > ul:eq(1) .js-move-items li.checked a').data("itemid");
      var position = this.$el.find('.choose-position .js-move-position li.checked a').data('label');
      var moveData = {
        "boardId": boardId,
        "listId": listId,
        "cardId": this.cardId,
        "position": position
      };

      cantas.socket.emit("move-card", moveData);
      this.$el.modal('hide');
    },

    moveSearch: function(event){
      cantas.utils.renderMoveSearch(event);
    },

    updateCheckedList: function(event) {
      var baordId = $(event.target).data('itemid');
      var tabIndex = 1;
      cantas.utils.renderMoveList(this, baordId, this.listId, tabIndex);
    },

    renderCardPosition: function(event){
      var itemId = $(event.target).data('itemid');
      this.updateCardPosition(itemId);
    },

    updateCardPosition: function(listId){
      var _this = this;
      var checkedItemPath = '.choose-position li.specific a';
      var positionItemsPath = '.choose-position .js-move-position';
      var checkedPositionPath = 'a[data-itemid*="'+ this.cardId +'"]';
      this.$el.find(checkedItemPath).removeClass('checked');
      this.cardColleciton.fetch({
        data: {
          listId: listId,
          isArchived: false
        },
        success: function(cards, response, options) {
          _this.$el.find(positionItemsPath).empty();
          cards.each(function(card){
            var itemView = new cantas.views.MoveItemView({
               model: {
                 "_id": card.id,
                'title': cards.indexOf(card) + 1
               }
            });
            _this._childrenViews.push(itemView)
            _this.$el.find(positionItemsPath).append(itemView.render().el);
          });
          _this.$el.find(checkedPositionPath).parent('li').addClass('checked');
        }
      });
    },
    
    updateMoveList: function(tabs){
      var _this = this;
      tabs.forEach(function(tab){
        var tabIndex = _.indexOf(tabs, tab);
        cantas.utils.renderMoveList(_this, _this.boardId, _this.listId, tabIndex);
      });
    },

    remove: function(){
      this.closeWindowOverlay();
      return this;
    },

    closeWindowOverlay: function(){
      var childrenViews = this._childrenViews;
      _.each(childrenViews, function(view){
        view.remove();
        childrenViews.pop(view);
      });

      this.undelegateEvents();
      this.stopListening();
      this.$el.empty();
    }

  });

  cantas.views.CardView = Backbone.View.extend({
    tagName:"div",
    className: "list-card ui-sortable js-list-card",

    // Cache the template function for a single item.
    template: jade.compile($("#template-card-view").text()),

    // The DOM events specific to an item.
    events:{
      "keypress .edit":"updateOnEnter",
      "click div.card-title": "showCardDetail",
      "click .card-setting": "showCardMenu",
      "mouseenter .card": "showCardSettingIcon",
      "mouseleave .card": "hideCardSettingIcon",
      'movefrom': "moveFrom",
      'movein': "moveIn"
    },

    initialize:function () {
      _.bindAll(this, "render");
      this.model.on('change', this.onModelChange, this);
      this.model.on('change:isArchived', this.isArchivedChanged, this);
      this.model.on('change:order change:listId', this.refreshCardOrder, this);
      this.model.on('remove', this.remove, this);

      this.cardLabelCollection = new cantas.models.CardLabelRelationCollection;
      this.voteCollection = new cantas.models.VoteCollection;
    },

    onModelChange: function() {
      this.render();
      this.refreshCardOrderNumber();
    },

    refreshCardOrderNumber: function() {
      var card = this.model;
      var monitorAttributes = ["listId", "order", "isArchived"];
      var hasChanged = monitorAttributes
        .map(function(item) { return card.hasChanged(item); })
        .reduce(function(left, right) { return left && right });
      if (hasChanged) {
        var listId = card.get("listId");
        $("#" + listId).find(".order-number").each(function(index, elem) {
          $(elem).text(index + 1);
        });
      }
    },

    render:function () {
      var data = this.model.toJSON();
      data.index = this.attributes.index;

      this.$el.empty();
      this.$el.html(this.template(data));
      this.$el.attr("id", this.model.id);
      // refresh card sortable
      SORTABLE.refreshCardSortable();

      this.cardNeonLightsView = new cantas.views.LabelNeonLightsView({
        el: this.$el.find('div.card-filter.clearfix'),
        collection: this.cardLabelCollection,
        card: this.model
      });

      this.cardNeonLightsView.turnOn();

      // disable edit/add function when user is not board member
      if (!window.cantas.isBoardMember) {
        this.disableEvents();
      };

      return this;
    },

    disableEvents: function() {
      this.$el.undelegate('.card-setting', 'click');
      this.$el.undelegate('.card', 'mouseenter');
      this.$el.undelegate('.card', 'mouseleave');
    },

    remove: function(){
      if (this.cardMenuView) {
        this.cardMenuView.remove();
      }

      if (this.cardDetailView) {
        this.cardDetailView.remove();
      }

      if (this.cardNeonLightsView) {
        this.cardNeonLightsView.close();
      }

      this.undelegateEvents();
      this.stopListening();
      this.$el.remove();
      return this;
    },

    updateOnEnter:function (e) {
      if (e.keyCode === 13) {
        this.close();
      }
    },

    isArchivedChanged: function (data){
      var that = this;
      //get that card's self listView
      var viewIdArray = _.map(cantas.utils.getCurrentBoardView().listViewCollection,function(child){ return child.model.id });
      var inListViewIndex = _.indexOf(viewIdArray, data.get("listId"));
      // if the listView exist in this board
      var inListView = cantas.utils.getCurrentBoardView().listViewCollection[inListViewIndex];


      // card archived
      if (data.get('isArchived') === true) {
        $(that.el).fadeOut('slow',function() {
          that.$el.hide();
        });

      // card unarchived
      } else if (inListView.model.get("isArchived") === false) {
          $(inListView.el).find(".list-content").append(this.render().el);
          this.$el.show();
      }

      //refresh card positions
      SORTABLE.refreshCardSortable();
    },

    showCardDetail: function (event) {
      event.stopPropagation();

      cantas.appRouter.navigate("card/" + this.model.id + "/" + $.slug(this.model.get("title")));

      this.cardDetailView = new cantas.views.CardDetailsView({
        model: this.model,
        cardLabelCollection: this.cardLabelCollection,
        voteCollection: this.voteCollection
      });
      return this.cardDetailView.render();
    },

    rememberMe: function () {
      // we only allow one expanded view at a time
      while (this.attributes.expandedViewChain.length > 0) {
        var view = this.attributes.expandedViewChain.shift();
        if (view !== undefined) {
          view.collapse();
        }
      }

      this.attributes.expandedViewChain.push(this);
    },

    forgetMe: function() {
      if (this.attributes.expandedViewChain.indexOf(this) >= 0) {
        this.attributes.expandedViewChain.pop();
      }
    },

    showCardMenu: function (event) {
      event.stopPropagation();

      if (!this.cardMenuView) {
        this.cardMenuView = new cantas.views.CardMenuView();
      }

      $("body").click();

      var offsetX = cantas.utils.getOffsetX(event.pageX, "#card-menu");

      this.cardMenuView.render({
        cardId: this.model.id,
        listId: this.model.get("listId"),
        pageX: event.pageX - offsetX,
        pageY: event.pageY
      });
      $(event.target).show();

      this.rememberMe();
    },

    collapse: function() {
      if (this.cardMenuView) {
        this.cardMenuView.undelegateEvents();
      }

      this.forgetMe();
    },

    showCardSettingIcon: function (event) {
      this.$el.find(".card-setting").show();
    },

    hideCardSettingIcon: function (event) {

      if($("#card-menu").is(":hidden") || this.el.id != $("#card-menu").attr("data-cardId"))
        this.$el.find(".card-setting").hide();
    },

    //Card sortable function
    // when card sortable event stop, the methods will fire.
    moveFrom: function(event, ui, fromListView) {
      var newPosition = ui.item.parent().children(".list-card:visible").index(ui.item);
      cantas.views.fromListView = fromListView;
      this.model.moveToList(fromListView, newPosition, ui.item);
    },

    // when the card move to new list, set new list id to this model
    moveIn: function(event, ui, inListView) {
      this.model.inListView = inListView;
      cantas.views.inListView = inListView;
    },

    refreshCardOrder: function() {
      var thatView = this;
      var thatModel = this.model;

      var fromListViewId = thatModel.previousAttributes().listId;
      var inListViewId = thatModel.get('listId');
      var viewIdArray = _.map(cantas.utils.getCurrentBoardView().listViewCollection,function(child){ return child.model.id });
      var inListViewIndex = _.indexOf(viewIdArray,inListViewId);
      if (-1 === inListViewIndex) {
        console.log("[refreshCardOrder]the Card have not exist view in this Board");
        return false;
      }
      var inListView = cantas.utils.getCurrentBoardView().listViewCollection[inListViewIndex];
      var fromListViewIndex = _.indexOf(viewIdArray,fromListViewId);
      var fromListView = cantas.utils.getCurrentBoardView().listViewCollection[fromListViewIndex];

      // update card quantity
      inListView.updateCardQuantity();

      if (fromListView) {
        fromListView.updateCardQuantity();
        //update cardCollection
        fromListView.model.cardCollection.remove(thatModel, {silent: true});
      }

      inListView.model.cardCollection.add(thatModel, {silent: true});
      //update cardViewCache in the listView
      inListView.cardViewCache[thatView.cid] = thatView;
      //update chardview order
      var activeCardArray = inListView.model.cardCollection.where({isArchived: false});
      var sortArray = _.map(activeCardArray, function(card) {
        return card.get('order');
      });
      sortArray = sortArray.sort(function(a,b){return a - b });
      var newPosition = _.indexOf(sortArray,thatModel.get('order'), isSorted = true);

      var cardViewCollection = $(inListView.el).find('section > div.list-card');

      var actionName = undefined;

      //moving cards to new list
      //case 1:move to empty list
      if (fromListView != inListView &&
        cardViewCollection.index($(thatView.el)) === -1 &&
        typeof cardViewCollection[newPosition -1] === 'undefined' &&
        typeof cardViewCollection[newPosition] === 'undefined' &&
        typeof cardViewCollection[newPosition + 1] === 'undefined') {
        actionName = "moveToEmptyList";
      }

      //case2:move to frist index of card array
      else if (fromListView != inListView &&
        cardViewCollection.index($(thatView.el)) === -1 &&
        typeof cardViewCollection[newPosition -1] === 'undefined' &&
        typeof cardViewCollection[newPosition] != 'undefined'){
        actionName = "moveToFirstInCardArray";
      }

      //case3:move to inPosition of card array
      else if (fromListView != inListView &&
        cardViewCollection.index($(thatView.el)) === -1 &&
        typeof cardViewCollection[newPosition -1] != 'undefined' &&
        typeof cardViewCollection[newPosition] != 'undefined'){
        actionName = "moveToInPositionInCardArray";
      }

      //case4: move to last index of card array
      else if (fromListView != inListView &&
        cardViewCollection.index($(thatView.el)) === -1 &&
        typeof cardViewCollection[newPosition -1] != 'undefined' &&
        typeof cardViewCollection[newPosition] === 'undefined' &&
        typeof cardViewCollection[newPosition + 1] === 'undefined') {
        actionName = "moveToLastPositionInNewList";
      }

      //moving cards in one listView
      //case 1:move to first position
      else if (fromListView === inListView &&
        cardViewCollection.index($(thatView.el)) != newPosition &&
        cardViewCollection[newPosition] != thatView &&
        newPosition === 0) {
        actionName = "moveToFirstPosition";
      }

      //case 2: moving to inPositions, from top to bottom
      else if (fromListView === inListView &&
        cardViewCollection.index($(thatView.el)) != newPosition &&
        cardViewCollection[newPosition] != thatView &&
        newPosition > 0 &&
        newPosition < sortArray.length &&
        thatModel.get('order') < thatModel.previous('order')) {
        actionName = "moveToInPositionFromTopToBottom";
      }

      //from bottom to top
      else if (fromListView === inListView &&
        cardViewCollection.index($(thatView.el)) != newPosition &&
        cardViewCollection[newPosition] != thatView &&
        newPosition > 0 &&
        newPosition < sortArray.length -1 &&
        thatModel.get('order') > thatModel.previous('order') ) {
        actionName = "moveFromBottomToTop";
      }

      //case 3: move to last index of card array
      else if (fromListView === inListView &&
        cardViewCollection.index($(thatView.el)) != newPosition &&
        cardViewCollection[newPosition] != thatView &&
        newPosition === sortArray.length -1) {
        actionName = "moveToLastInCardArray";
      }

      // move card from another Board
      else if (typeof fromListView === 'undefined' &&
               sortArray.length > 1 &&
               newPosition === 0 ){
        actionName = "moveToFirstPosition";
      }
      else if (typeof fromListView === 'undefined' &&
               sortArray.length > 1 &&
               newPosition > 0 &&
                 newPosition < sortArray.length) {
        actionName = "moveToInPositionFromTopToBottom";
      } 
      else if (
        typeof fromListView === 'undefined' &&
          sortArray.length > 1 &&
          newPosition === sortArray.length -1) {
        actionName = "moveToLastInCardArray";
      }
      else {
        // FIXME: when card moving trigger two event(order, listId),
        // the last event should be ignore it, it don't need trigger
        // this error log.
        // console.log(
        //   "Cantas:Error:do not know how to move card " + thatModel.id);
      }

      // Exit if I do know how to move this card.
      if (actionName === undefined)
        return;

      var actions = {
        moveToEmptyList: function() {
          $(inListView.el).find('section').append($(thatView.el));
        },
        moveToFirstInCardArray: function() {
          cardViewCollection.eq(newPosition).before($(thatView.el));
        },
        moveToInPositionInCardArray: function() {
          cardViewCollection.eq(newPosition).before($(thatView.el));
        },
        moveToLastPositionInNewList: function() {
          cardViewCollection.eq(newPosition - 1).after($(thatView.el));
        },
        moveToFirstPosition: function() {
          cardViewCollection.eq(newPosition).before($(thatView.el));
        },
        moveToInPositionFromTopToBottom: function() {
          cardViewCollection.eq(newPosition).before($(thatView.el));
        },
        moveFromBottomToTop: function() {
          cardViewCollection.eq(newPosition).after($(thatView.el));
        },
        moveToLastInCardArray: function() {
          cardViewCollection.eq(newPosition).after($(thatView.el));
        }
      };

      actions[actionName]();

      //refresh card order number
      this.refreshCardOrderNumber();
      //refresh card positions
      SORTABLE.refreshCardSortable();
    }

  });

  // extend `CardDetailsView` from `cantas.views.CardView`.
  cantas.views.CardDetailsView = cantas.views.CardView.extend({

    tagName:"div",

    el: $("#card-detail"),

    template: jade.compile($("#template-card-detail-view").text()),

    events:{
      "click .js-edit-title": "openEditTitleDialog",
      "click .js-edit-desc": "openEditDescDialog",
      "click .js-save-title": "onTitleSaveClick",
      "click .js-cancel-title": "onTitleCancelClick",
      "click .js-save-desc": "onDescriptionSaveClick",
      "click .js-cancel-desc": "onDescriptionCancelClick",

      "click .js-archive-card": "archiveCard",
      "click .js-edit-assign": "toggleAssignWindow",
      "click .js-edit-label": "toggleLabelWindow",
      "click .js-edit-vote": "toggleVoteWindow",
      "click .js-add-comment": "addComment",
      "click .js-add-attachment": "addAttachment",
      "hidden": "closeCardDetail",
      "click .js-add-checklist": "onChecklistClick"
    },

    initialize: function (options) {
      // initialize
      this.model.on('change:title', this.titleChanged, this);
      this.model.on('change:description', this.descriptionChanged, this);
      this.model.on('change:assignees', this.assigneesChanged, this);
      this.commentTemplate = jade.compile($("#template-comment-item-view").text());

      this.cardLabelCollection = options.cardLabelCollection;
      this.voteCollection = options.voteCollection;
    },

    render:function () {
      var card = this.model.toJSON();
      card.assignees = this._concatAssignees();
      card.description = cantas.utils.safeString(card.description);
      card.description = cantas.utils.escapeString(card.description);

      this.$el.html(this.template({card: card}));
      this.$el.modal();
      cantas.setTitle("Card|"+this.model.get("title"));

      this.renderCommentView();

      this.renderAttachmentView();

      this.cardVotesTotalView = new cantas.views.CardVotesTotalView({
        el: $("a.card-vote"),
        collection: this.voteCollection,
        card: this.model
      });
      this.cardVotesTotalView.render();

      // Initialize views used in detail view.
      this.checklistSectionView = new cantas.views.ChecklistSectionView({
        el: $("section.js-checklist-section"),
        collection: new cantas.models.ChecklistCollection([], {
          card: this.model
        }),
        card: this.model
      });

      this.checklistSectionView.render();

      //disable add/update function when user is not board member.
      if (!window.cantas.isBoardMember) {
        this.disableEvents();
      };

      this.detailsNeonLightsView = new cantas.views.LabelNeonLightsView({
        el: this.$el.find('div.card-filter.clearfix'),
        collection: this.cardLabelCollection,
        card: this.model
      });

      this.detailsNeonLightsView.turnOn();
      this.listenTo(this.detailsNeonLightsView, 'setLabelCpation', this.toggleLabelCaption);

      var _this = this;

      this.fileupload = this.$el.find('#attachmentUpload').fileupload({
        autoUpload: false,
        url: '/upload/' + card._id,
        maxFileSize: 10000000,
        dataType: 'json'
      }).on('fileuploadadd', function (e, data) {
        var newAttachmentUploadItemView = new cantas.views.AttachmentUploadItemView({
          'model': data.files[0],
          'data': data,
          'parentView': _this
        });
        data.context = newAttachmentUploadItemView.render().$el;
        var uploadTableEl = _this.$('.js-attachment-upload-table');
        if(uploadTableEl.find('tbody tr').length == 0) {
          uploadTableEl.prepend('<thead><tr><th>Preview</th><th>File Name</th><th>Size</th></tr></thead>');
        }
        _this.$('.js-attachment-upload-table tbody').append(data.context);
      }).on('fileuploadprocessalways', function (e, data) {
        var file = data.files[0];
        if(file.preview) {
          data.context.find('.upload-preview').append(file.preview);
        }
        if(file.error) {
          data.context.find('.upload-control').append($('<p>',{
            'class': 'upload-errormessage',
            'text': file.error
          })).find('.upload-errormessage').prepend($('<span>', {
            'class': 'label label-important',
            'text': 'Error'
          }));
        }
        data.context.find('.js-upload-start').text('Start').prop('disabled', !!file.error);
      }).on('fileuploadprogress', function (e, data) {
        var progress = Math.floor(data.loaded / data.total * 100);
        data.context.find('.js-upload-progress').prop('aria-valuenow', progress)
          .find('.bar').css('width', progress + '%');

      }).on('fileuploaddone', function (e, data) {
        data.context.find('.upload-errormessage').remove();

        if(data.result.user_error) {
          _this.reportUploadError(data.context, data.result.user_error);
          throw new Error(data.result.maintainer_error);
        } else {
          data.context.find('.js-upload-abort').text('Finished').prop('disabled', true);
          data.context.fadeOut().remove();
          var uploadTableEl = _this.$('.js-attachment-upload-table');
          if (uploadTableEl.find('tbody tr').length === 0) {
            uploadTableEl.find('thead').remove();
          }

          var newAttachment = new cantas.models.Attachment(data.result.attachment);
          newAttachment.save();
        }

      }).on('fileuploadfail', function (e, data) {
        data.context.find('.upload-errormessage').remove();
        _this.reportUploadError(data.context, 'Uploading attachment failed');
      });

      return this;
    },

    reportUploadError: function(context, errorMessage) {
      context.find('.js-abort').removeClass('js-abort').addClass('js-start')
        .text('Start').prop('disabled', false);
      context.find('.upload-control').append($('<p>',{
        'class': 'upload-errormessage',
        'text': errorMessage,
      })).find('.upload-errormessage').prepend($('<span>', {
        'class': 'label label-important',
        'text': 'Error'
      }));
    },

    disableEvents: function() {
      this.$el.undelegate('.js-edit-title', 'click');
      this.$el.undelegate('.js-edit-assign', 'click');
      this.$el.undelegate('.js-edit-label', 'click');
      this.$el.undelegate('.js-add-checklist', 'click');
      this.$el.undelegate('.js-add-attachment', 'click');
      this.$el.undelegate('.js-edit-desc', 'click');
      this.$el.find('a .js-edit-desc').hide();
    },

    renderCommentView: function(){
      this.commentView = new cantas.views.CommentView({model: this.model});
      this.commentView.render();
    },

    renderAttachmentView: function(){
      this.attachmentView = new cantas.views.AttachmentView({model: this.model});
      this.attachmentView.render();
    },

    openEditTitleDialog: function (event) {
      event.stopPropagation();
      this.$el.find(".js-title").hide();
      this.$el.find(".js-edit-title-area").show();
      this.$el.find(".js-title-input").val(this.model.get("title")).select();
    },

    onTitleSaveClick: function(event) {
      // trim avoid strings with only tabs or whitespaces.
      var newValue = $(".js-title-input").val().trim();
      // empty title
      if (!newValue) {
        return false;
      }
      this.model.set("title", newValue);
      if (this.model.hasChanged("title")) {
        this.model.patch({title: newValue});
      }
      this.$el.find(".js-title").show();
      this.$el.find(".js-edit-title-area").hide();
    },

    titleChanged: function(data){
      this.$el.find(".js-title").html(this.model.get("title"));
    },

    onTitleCancelClick: function(event) {
      this.$el.find(".js-title").show();
      this.$el.find(".js-edit-title-area").hide();
      return false;
    },

    openEditDescDialog: function(event){
      this.$el.find(".js-edit-desc").hide();
      this.$el.find(".js-edit-desc-area").show();
      this.$el.find(".js-desc-input").val(this.model.get("description")).select();
    },

    onDescriptionSaveClick: function(event) {
      event.stopPropagation();
      var newValue = this.$el.find(".js-desc-input").val();

      // empty desc
      if (!newValue) {
        return false;
      }
      this.model.set("description", newValue);
      if (this.model.hasChanged("description")) {
        this.model.patch({description: newValue});
      }
      this.$el.find(".js-edit-desc").show();
      this.$el.find(".js-edit-desc-area").hide();
      this.$el.find(".js-desc-input").val("");
    },

    descriptionChanged: function(data){
      var desc = cantas.utils.safeString(this.model.get("description"));
      desc = cantas.utils.escapeString(desc);
      this.$el.find(".js-desc").html(desc);
    },

    onDescriptionCancelClick: function(event) {
      this.$el.find(".js-edit-desc").show();
      this.$el.find(".js-edit-desc-area").hide();
      this.$el.find(".js-desc-input").val("");
      return false;
    },

    toggleAssignWindow: function(event){
      event.stopPropagation();
      if (typeof this.cardAssignView === "undefined"){
        this.cardAssignView = new cantas.views.CardAssignView({model: this.model});
      }
      if (typeof this.cardVoteView !== "undefined" && this.cardVoteView.isRendered) {
        this.cardVoteView.closeVoteWindow(event);
      }
      if (typeof this.labelAssignView !== "undefined" && this.labelAssignView.isRendered){
          this.labelAssignView.closeLabelWindow(event);
      }
      if (this.cardAssignView.isRendered){
        this.cardAssignView.closeAssignWindow(event);
      }else{
        this.cardAssignView.render();
        // FIXME: scroll to cardAssignView
        $('.modal-scrollable').scrollTop(0);
      }
    },

    toggleLabelWindow: function(event){
      event.stopPropagation();
      if (typeof this.labelAssignView === "undefined"){
        this.labelAssignView = new cantas.views.LabelAssignView({
          collection: new cantas.models.CardLabelRelationCollection,
          card: this.model,
          parentView: this
        });
      }
      if (typeof this.cardVoteView !== "undefined" && this.cardVoteView.isRendered) {
          this.cardVoteView.closeVoteWindow(event);
      }
      if (typeof this.cardAssignView !== "undefined" && this.cardAssignView.isRendered){
          this.cardAssignView.closeAssignWindow(event);
      }
      if (this.labelAssignView.isRendered){
        this.labelAssignView.closeLabelWindow(event);
      }else{
        this.labelAssignView.render();
        $('.modal-scrollable').scrollTop(0);
      }
    },

    toggleLabelCaption: function(labelCaptionDisplay) {
      var labelCaption = this.$('.js-edit-label span').eq(0);
      if(labelCaptionDisplay === true)
        labelCaption.show();
      else
        labelCaption.hide();
    },

    toggleVoteWindow: function(event){
      event.stopPropagation();
      if (typeof this.cardVoteView === "undefined") {
        this.cardVoteView = new cantas.views.CardVoteView({
          collection: this.voteCollection,
          card: this.model
        });
      }
      if (typeof this.labelAssignView !== "undefined" && this.labelAssignView.isRendered) {
          this.labelAssignView.closeLabelWindow(event);
      }
      if (typeof this.cardAssignView !== "undefined" && this.cardAssignView.isRendered) {
        this.cardAssignView = new cantas.views.CardAssignView({model: this.model});
      }
      if (this.cardVoteView.isRendered){
        this.cardVoteView.closeVoteWindow(event);
      }else{
        this.cardVoteView.render();
        $('.modal-scrollable').scrollTop(0);
      }
    },

    assigneesChanged: function(data){
      var assignees = this._concatAssignees();
      this.$el.find(".js-assignees").html(assignees);
    },

    canComment: function() {
      var commentStatus = cantas.utils.getCurrentCommentStatus();
      if (commentStatus == 'disabled') {
        return false;
      } else {
        if (commentStatus == 'enabled' && !window.cantas.isBoardMember) {
          return false;
        }
      }
      return true;
    },

    addComment: function(event){
      if (this.canComment()) {
        event.stopPropagation();
        this.$el.find('.js-add-comment-input').focus();
      }
    },

    addAttachment: function(event){
      event.stopPropagation();
      this.$('input[type="file"]').click();
      
    },

    closeCardDetail: function () {
      this.close();
    },

    close: function(){
      if (this.detailsNeonLightsView) {
        //shared cardLabelCollection with CardView.
        //So here we only need remove LightsView
        this.detailsNeonLightsView.remove();
      }

      if (this.checklistSectionView) {
        this.checklistSectionView.close();
      }

      if (this.commentView) {
        this.commentView.remove();
      }

      if (this.cardAssignView) {
        this.cardAssignView.remove();
      }

      if (this.labelAssignView) {
        this.labelAssignView.remove();
      }

      this.remove();
      var boardId = cantas.utils.getCurrentBoardModel().id;
      var boardTitle = cantas.utils.getCurrentBoardModel().get("title");
      var slug = $.slug(boardTitle);
      cantas.appRouter.navigate("board/" + boardId + "/" + slug);
      cantas.setTitle("Board|"+boardTitle);

      this.checklistSectionView.close();
    },

    archiveCard: function(event){
      event.stopPropagation();
      this.model.patch({isArchived: true});
      this.$el.find(".js-close-card-detail").trigger("click");
    },

    onChecklistClick: function(event) {
      var card = this.model;

      var view = new cantas.views.EntryView({
        placeholder: "Checklist title",
        buttons: [{
          name: "confirm",
          eventHandler: function(event, data) {
            var title = data.entryView.getText();
            if (title.length === 0)
              return;
            var checklist = new cantas.models.Checklist({
              title: title, cardId: data.card.id,
              authorId: cantas.utils.getCurrentUser().id
            });
            checklist.save();
            data.entryView.trigger("cancel");
          },
          data: {card: this.model}
        }, {
          name: "cancel",
          eventHandler: function(event, data) {
            data.entryView.remove();
          }
        }]
      });
      this.$el.find("section.js-checklist-section").append(view.render().el);
      view.focus();
    },

    _concatAssignees: function(){
      var assignees = this.model.get("assignees");
      return assignees.length ? _.pluck(assignees, "username").join(", ") : "Assign...";
    }

  });

  cantas.views.CardAssignView = Backbone.View.extend({
    el: "div.window-assign",

    template: jade.compile($("#template-card-assign-view").text()),

    events: {
      "click .js-select-assignee": "selectAssignee",
      "click .js-save-assignee": "saveAssignee",
      "click .js-close-assign-window": "closeAssignWindow"
    },

    initialize: function(){
      this.isRendered = false;
    },

    render: function(){
      var members = this._getMembersToAssign();
      this.$el.html(this.template({members: members}));
      this.$el.show();
      this.isRendered = true;
    },

    _getMembersToAssign: function(){
      var assignees = _.pluck(this.model.get("assignees"), "_id");
      var members = cantas.utils.getCurrentBoardView().memberCollection.toJSON().map(function(member){
        if (assignees.indexOf(member.userId._id) === -1){
          member.checked = false;
        }else{
          member.checked = true;
        }
        return member;
      });
      return members;
    },

    selectAssignee: function(event){
      event.stopPropagation();
      var element = $(event.target);
      var uid = element.data('uid');
      if (!uid){
        element = element.parent();
      }
      element.toggleClass("checked");
    },

    saveAssignee: function(event){
      event.stopPropagation();
      var newAssignees = [];
      $("ul.assignee li.checked").each(function(index, element){
        var uid = $(element).data('uid');
        newAssignees.push(uid);
      });
      var oldAssignees = _.pluck(this.model.get("assignees"), "_id");
      if (!_.isEqual(newAssignees.sort(), oldAssignees.sort())){
        // update if assignees changed
        this.model.patch({assignees: newAssignees});
      }
      // hide assign window
      this.$el.find(".js-close-assign-window").trigger("click");
    },

    closeAssignWindow: function(event){
      event.stopPropagation();
      this.$el.hide();
      this.isRendered = false;
    }

  });

  /*
   * View: LabelAssignView
   */
  cantas.views.LabelAssignView = Backbone.View.extend({
    el: "div.window-label",

    template: jade.compile($("#template-label-assign-view").text()),

    events: {
      "click .js-close-label-window": "closeLabelWindow",
      "click .label-items li": "toggleSelectStatus"
    },

    initialize: function(){
      this.isRendered = false;
      this.collection.on("change:selected", this.selectedChanged, this);

    },

    render: function() {
      var self = this;
      this.loadLabelsOnlyOnce(function(collection, response, options) {
        var relations = self.collection.toJSON();
        var template_data = {relations: relations};
        self.$el.html(self.template(template_data));
        self.$el.show();
        self.isRendered = true;
      });

      return this;
    },

    toggleSelectStatus: function(event){
      event.stopPropagation();

      var relation = this.collection.get($(event.target).closest("li").attr("id"));
      var selected = !relation.get("selected");
      relation.patch({selected: selected});

      this.isRendered = false;
    },

    selectedChanged: function(model) {
      this.$("#" + model.id).toggleClass("checked");
      if(this.$('ul.label-items li.checked').length > 0)
        this.toggleLabelCaption(false);
      else
        this.toggleLabelCaption(true);
    },

    closeLabelWindow: function(event){
      event.stopPropagation();
      this.$el.hide();
      this.isRendered = false;
    },

    toggleLabelCaption: function(labelCaptionDisplay) {
      var labelCaption = this.options.parentView.$('.js-edit-label span').eq(0);
      if(labelCaptionDisplay === true)
        labelCaption.show();
      else
        labelCaption.hide();
    },

    loadLabelsOnlyOnce: function(callback) {
      if (this.lablesLoaded)
        return;

      this.collection.fetch({
        data: {
          boardId: this.options.card.boardId,
          cardId: this.options.card.id
        },
        success: function(collection, response, options) {
          this.labelsLoaded = true;
          callback(collection, response, options);
        }
      });
    }

  });

  cantas.views.CardMenuView = Backbone.View.extend({
    el: "div#card-menu",

    events: {
      "click .js-archive-card": "archiveCard",
      "click .js-move-card": "moveCard"
    },

    initialize: function () {
      _.bindAll(this, "render");

      //when clicking outside area of the list-menu, it will disappear.
      $("body").on("click", function (event){
        $(".card-menu,.card-setting").hide();
      });
    },

    _getCardModel: function(){
      return cantas.utils.getCardModelById(this.cardId);
    },

    render: function (context) {
      this.cardId = context.cardId;
      this.listId = context.listId;
      this.$el.attr("data-cardId", this.cardId);
      this.$el.css({"left": context.pageX, "top": context.pageY});


      this.delegateEvents();
      this.$el.toggle();
      return this;
    },

    archiveCard: function(event){
      this.hideCardMenu(event);
      var card = this._getCardModel();
      card.patch({
        isArchived: true,
        original: {isArchived: false}
      });
    },

    moveCard: function(event) {
      this.hideCardMenu(event);
      this.moveCardToView = new cantas.MoveCardToView({
        title: 'Move Card',
        listId: this.listId,
        cardId: this.cardId
      });

      this.moveCardToView.render();
    },

    hideCardMenu: function(event){
      event.stopPropagation();
      this.undelegateEvents();
      this.$el.hide();
    },

    remove: function(){
      if (this.moveCardToView){
        this.moveCardToView.remove();
      }
      this.undelegateEvents();
      this.stopListening();
      return this;
    }

  });

  /*
   * View to display all selected labels of a card
   *
   * NeonLightsView manages a DOM element and will feed rendered HTML to that.
   * In the meanwhile, view also needs CardLabelRelationCollection to control
   * when to render new HTML according to the change of selected status.
   */
  cantas.views.LabelNeonLightsView = Backbone.View.extend({
    template: jade.compile($("#template-card-labels-neonlights").text()),

    initialize: function() {
      this.collection.on("change:selected", this.render, this);
    },

    render: function() {
      var renderContext = {relations: this.collection.toJSON()};
      this.$el.html(this.template(renderContext));
      return this;
    },

    turnOn: function() {
      var self = this;

      if (self.collectionFetched) {
        self.render();
        return;
      }

      this.collection.fetch({
        data: {cardId: this.options.card.id},
        success: function(collection, response, options) {
          var labelCaptionDisplay = true;
          collection.forEach(function(relation) {
            relation.on('update:selected', self.render, self);
            if(relation.toJSON().selected === true)
              labelCaptionDisplay = false;
          });
          self.trigger('setLabelCpation', labelCaptionDisplay);
          self.collectionFetched = true;
          self.render();
        }
      });
    },

    close: function() {
      this.collection.dispose();
      this.remove();
    }
  });

  cantas.views.CardVotesTotalView = Backbone.View.extend({
    template: jade.compile($("#template-card-votes-total-view").text()),

    initialize: function() {
      this.collection.on("add", this.render, this);
      this.collection.on("change", this.render, this);
      this.collection.on("remove", this.render, this);
    },

    render: function() {
      var self = this;
      this.collection.fetch({
        data: {cardId: this.options.card.id},
        success: function(collection, response, options) {
          var voteYesNum = collection.where({yesOrNo: true}).length;
          var voteNoNum = collection.length - voteYesNum;
          var votes = {voteYes: voteYesNum, voteNo: voteNoNum};
          self.$el.html(self.template(votes));
          var myVote = collection.findWhere({
            authorId: cantas.utils.getCurrentUser().id
          });
          if (myVote !== undefined) {
            var yesOrNo = myVote.attributes.yesOrNo;
            if (yesOrNo === true) {
              self.$el.find('span.agree').addClass('checked');
            } else if (yesOrNo === false) {
              self.$el.find('span.disagree').addClass('checked');
            }
          }
          return self;
        }
      });
    }
  });

  cantas.views.CardVoteView = Backbone.View.extend({
    el: "div.window-vote",

    template: jade.compile($("#template-card-vote-view").text()),

    events: {
      "click .js-close-vote-window": "closeVoteWindow",
      "click .js-vote-agree": "voteYes",
      "click .js-vote-disagree": "voteNo"
    },

    initialize: function(){
      this.isRendered = false;
      this.voteFlag = '';
    },

    render: function() {
      var self = this;
      var voteControl = this.canVote();

      if (voteControl === 'opened') {
        this.collection.fetch({
        data: {
          cardId: this.options.card.id,
          authorId: cantas.utils.getCurrentUser().id
        },
        success: function(collection, response, options) {
          var myVote = collection.findWhere({
            authorId: cantas.utils.getCurrentUser().id
          });
          if(myVote !== undefined) {
            var yesOrNo = myVote.attributes.yesOrNo;
            self.renderMyVote(yesOrNo);
          }
        }
        });
      }
      this.$el.html(this.template({voteControl: voteControl}));
      this.$el.show();
      this.isRendered = true;
      return this;
    },

    canVote: function() {
      var curBoard = cantas.utils.getCurrentBoardModel();
      var result;
      if (curBoard.attributes.voteStatus === 'opened') {
        result = 'opened';
      } else if (curBoard.attributes.voteStatus === 'disabled') {
        result = 'closed';
      } else if(curBoard.attributes.voteStatus === 'enabled' && window.cantas.isBoardMember) {
        result = 'opened';
      } else {
        result = 'disabled';
      }
      return result;
    },

    renderMyVote: function(yesOrNo) {
      switch (yesOrNo) {
        case true:
          $('#card-agree, span.agree').addClass('checked');
          this.voteFlag = 'agree';
          break;
        case false:
          $('#card-disagree, span.dis').addClass('checked');
          this.voteFlag = 'disagree';
          break;
      }
    },

    voteYes: function() {
      var myVote = this.collection.findWhere({
        authorId: cantas.utils.getCurrentUser().id
      });
      switch(this.voteFlag) {
        case 'agree':
          $('#card-agree, span.agree').removeClass('checked');
          this.voteFlag = '';
          myVote.destroy();
          break;
        case 'disagree':
          $('#card-disagree, span.disagree').removeClass('checked');
          $('#card-agree, span.agree').addClass('checked');
          this.voteFlag = 'agree';
          myVote.patch({yesOrNo: true});
          break;
        default:
          $('#card-agree, span.agree').addClass('checked');
          this.voteFlag = 'agree';
          var newVote = new cantas.models.Vote({
            cardId: this.options.card.id,
            authorId: cantas.utils.getCurrentUser().id
          });
          newVote.save();
      }
    },

    voteNo: function() {
      var myVote = this.collection.findWhere({
        authorId: cantas.utils.getCurrentUser().id
      });
      switch(this.voteFlag) {
        case 'agree':
          $('#card-agree, span.agree').removeClass('checked');
          $('#card-disagree, span.disagree').addClass('checked');
          this.voteFlag = 'disagree';
          myVote.patch({yesOrNo: false});
          break;
        case 'disagree':
          $('#card-disagree, span.disagree').removeClass('checked');
          this.voteFlag = '';
          myVote.destroy();
          break;
        default:
          $('#card-disagree, span.disagree').addClass('checked');
          this.voteFlag = 'disagree';
          var newVote = new cantas.models.Vote({
            yesOrNo: false,
            cardId: this.options.card.id,
            authorId: cantas.utils.getCurrentUser().id
          });
          newVote.save();
      }
    },

    closeVoteWindow: function(event) {
      event.stopPropagation();
      this.$el.hide();
      this.isRendered = false;
    }

  });

}(jQuery, _, Backbone));
