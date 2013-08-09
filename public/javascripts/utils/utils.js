$(function ($, _, Backbone) {

  "use strict";

  window.cantas = window.cantas || {};
  var utils = cantas.utils || {};

  utils.getCurrentBoardId = function() {
    return cantas.utils.getCurrentBoardModel().id
  };

  utils.getCurrentBoardView = function() {
    return cantas.appRouter.currentView;
  };

  utils.getCurrentBoardModel = function() {
    return cantas.utils.getCurrentBoardView().model;
  };

  utils.getCardModelById = function(cardId){
    var card = undefined;
    cantas.utils.getCurrentBoardModel().listCollection.every(function(list){
      card = list.cardCollection.get(cardId);
      return card ? false: true;
    });
    return card;
  };

  utils.getCurrentUser = function() {
    return cantas.user;
  };

  utils.getCurrentCommentStatus = function() {
    var currentBoard = cantas.utils.getCurrentBoardModel();
    return currentBoard.attributes.commentStatus;
  };

  utils.renderTimeoutBox = function() {
    $('div.force-alert > div.alert-content > p')
      .html('Caution: failed to sync with the Cantas server. Changes made now may not be saved.');
    $('div.force-alert').fadeIn('slow');
  };

  utils.renderClearTimeoutBox = function() {
    $('div.force-alert > div.alert-content > p')
      .html('');
    $('div.force-alert').fadeOut('slow');
  };

  utils.randomWait = function(base, max){
    return Math.floor(base + Math.random() * max)
  };

  /*
   * Format date via moment.js (http://momentjs.com/docs/)
   *
   * Arguments:
   * - date: datetime string or Date() object.
   * - format: format string
   */
  utils.formatDate = function(date, format){
    var format = format || "YYYY-MM-DD HH:mm:ss Z";
    return moment(date).format(format);
  };

  /*
   *  when new list or card, the order will generate by this method
   *  args:
   *    collection: it should be provide, listCollection or cardCollection
   *
   */
  utils.calcPos = function(collection) {
    var widthNumber = 65536;
    var cardOrder = -1;
    var cardCount = collection.length;
    if(cardCount > 0) {
      var lastOrder = _.last(collection.pluck("order"));
      cardOrder = lastOrder + widthNumber;
    } else {
      cardOrder = cardOrder + widthNumber;
    }
    return cardOrder;
  };

  /*
   * validate the email address
   *
   * Arguments:
   * - email: string content of email address
   */
  utils.checkEmail = function(email) {
    var emailRegExp = /^[a-z]([a-z0-9]*[-_]?[a-z0-9]+)*@([a-z0-9]*[-_]?[a-z0-9]+)+[\.][a-z]{2,3}([\.][a-z]{2})?$/i;
    return emailRegExp.test(email);
  };

  utils.formatFileSize = function (bytes) {
    if(typeof bytes !== 'number') {
      return '';
    }
    if(bytes >= 1000000000) {
      return (bytes / 1000000000).toFixed(2) + ' GB';
    }
    if(bytes >= 1000000) {
      return (bytes / 1000000).toFixed(2) + ' MB';
    }
    return (bytes / 1000).toFixed(2) + ' KB';
  };

  var _renderMoveSelectionList = function(_this, collection, tabId, tabIndex, queryData) {
    collection.fetch({
      data: queryData,
      success: function (collection, response, options){
        var moveItemsPath = '.choose-position > ul:eq(' + tabIndex + ') .js-move-items';
        var checkedItemPath = "a[data-itemid*='" + tabId + "']";
        _this.$el.find(moveItemsPath).empty();
        collection.each(function(oneItem){
          var itemView = new cantas.views.MoveItemView({
            model: oneItem.toJSON()
          });
          _this._childrenViews.push(itemView);
          _this.$el.find(moveItemsPath).append(itemView.render().el);
        });
        _this.$el.find(checkedItemPath).parent('li').addClass('checked');
      }
    });
  };

  utils.renderMoveList = function(_this, boardId, listId, tabIndex) {
    //default parameter set by board items
    var collection = _this.boardCollection;
    var tabId = boardId;
    var queryData = {};
    var boardIds = [];

    //board list should be those user has permission to add list/card in it.
    if(tabIndex === 0) {
      var user = utils.getCurrentUser();
      var boardMemberQueryData = {
        userId: user.id,
        $or: [{status: 'available'}, {status: 'inviting'}]
      };
      _this.boardMemberCollection.fetch({
        data: boardMemberQueryData,
        success: function(boardMemberRelations, response, options) {
          boardIds = boardMemberRelations.map(function(boardMemberRelation) {
            return boardMemberRelation.get("boardId");
          });
          queryData = {
            isClosed: false,
            $or: [{creatorId: user.id}, {"_id": { $in: boardIds }}]
          };

          //get and render board items
          _renderMoveSelectionList(_this, collection, tabId, tabIndex, queryData);
        }
      });
    }

    // update parameter when update list items
    if(tabIndex === 1) {
      collection = _this.listCollection;
      tabId = listId;
      queryData = {"boardId": boardId, "isArchived": false};

      //get and render list items
      _renderMoveSelectionList(_this, collection, tabId, tabIndex, queryData);
    }

  };

  utils.renderMoveSearch = function(event){
    var input = $(event.target).val();
    $(event.target).parent().siblings()
      .find('.js-move-items li').show();
    $(event.target).parent().siblings()
      .find('.js-move-items li a')
      .not('[data-label*="'+ input+'"]').parent().hide();
  };

  /**
   * apply popup menu window's offsetX, such as card menu.
   */
  utils.getOffsetX = function(pageX, targetBox){
    var offsetX = 0;
    if(pageX + $(targetBox).outerWidth(true) > $(window).width()){
      offsetX = pageX + $(targetBox).outerWidth(true) - $(window).width();
    }
    return offsetX;
  };

  /**
   * apply popup menu window's offsetY, such as card menu.
   */
  utils.getOffsetY = function(pageY, targetBox){
    var offsetY = 0;
    if(pageY + $(targetBox).outerHeight(true) > $(window).height()){
      offsetY = pageY + $(targetBox).outerHeight(true) - $(window).height();
    }
    return offsetY;
  };

  /**
   *  global cantas.utils declare
   * */
  cantas.utils = utils;

}(jQuery, _, Backbone));
