/*
 * Checklist View used within Card View.
 */

(function ($, _, Backbone) {

  "use strict";

  /*
   * View to include all views of Checklists.
   * View and all sub-views are lazy-loading. That is, models will be loaded
   * only once when card detail is shown to use. The model design guarantees
   * that checklist and checklist item is updated in real-time, such as an new
   * checklist item is added when it is added by another board member.
   *
   * View needs a collection of checklists to show existing checklists.
   */
  cantas.views.ChecklistSectionView = cantas.views.BaseView.extend({
    initialize: function(options) {
      // Hash to store all checklist view. The key is the view's data-id, and
      // the value is the view object.
      this.checklistViews = {};

      var _options = options || {};
      this.card = _options.card;
      if (this.card === undefined) {
        throw new Error("Missing card object");
      }
      this.collection.on("add", this.onChecklistCreated, this);

      this.isConfirmDeleteChecklist = true;
    },

    render: function() {
      var self = this;
      this.collection.fetch({
        data: {cardId: this.card.id}
      });
    },

    close: function() {
      var subviews = this.checklistViews;
      var i = 0;
      var name;
      for (name in subviews) {
        if (subviews.hasOwnProperty(name)) {
          subviews[name].close();
        }
      }
      this.collection.dispose();

      var parent = cantas.views.BaseView;
      parent.prototype.close.apply(this, arguments);
    },

    onChecklistCreated: function(checklist) {
      var view = new cantas.views.ChecklistView({
        parentView: this,
        model: checklist,
        card: this.card
      });
      this.addChecklistView(view);
      view.renderAll();
      var currentUser = cantas.utils.getCurrentUser();
      var isCurrentUserAdding = checklist.get("authorId") === currentUser.id;
      if (isCurrentUserAdding) {
        view.addNewItem();
      }
    },

    addChecklistView: function(view) {
      this.$el.append(view.render().el);
      this.checklistViews[view.model.id] = view;
    }
  });

  /*
   * View to show a checklist information and all items.
   *
   * View needs a model of checklist to show each existing checklist.
   */
  cantas.views.ChecklistView = cantas.views.BaseView.extend({
    tagName: "section",
    className: "checklist",
    template: jade.compile($("#template-card-checklist").text()),

    id: function() {
      return this.model.id;
    },

    events: {
      "click .js-checklist-delete": "onDeleteClick",
      "click .js-add-item a": "onAddItemClick",
      "click .js-fold-items": "onFoldItems"
    },

    initialize: function() {
      this.itemViews = {};
      this.model.itemCollection.on("add", this.onChecklistItemAdded, this);
      this.model.itemCollection.on("remove", this.onChecklistItemRemoved, this);
      this.model.on('remove', this.onModelRemove, this);

      this.isConfirmDeleteChecklistItem = true;
    },

    close: function() {
      var subviews = this.itemViews;
      var name;
      for (name in subviews) {
        if (subviews.hasOwnProperty(name)) {
          subviews[name].close();
        }
      }

      var parent = cantas.views.BaseView;
      parent.prototype.close.apply(this, arguments);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.find('a.js-fold-items').hide();
      if (!window.cantas.isBoardMember) {
        this.undelegateEvents();
        this.$el.find('li.js-add-item').hide();
        this.$el.find('a.js-checklist-delete').hide();
      }
      // Checklist shouldn't be deleted by others
      if (cantas.utils.getCurrentUser().id !== this.model.attributes.authorId) {
        this.$el.find('a.js-checklist-delete').hide();
      }
      return this;
    },

    /*
     * Render checklist items separated from checklist's rendering gives
     * developer the chance to do this when needed indeed
     */
    renderItems: function() {
      var self = this;
      var collection = this.model.itemCollection;
      collection.fetch({
        data: {checklistId: this.model.id}
      });
    },

    /*
     * A convenient way to render a complete Checklist.
     */
    renderAll: function() {
      this.render();
      this.renderItems();
    },

    /*** Response to socket events ***/

    onChecklistItemAdded: function(checklistItem) {
      this.itemViews[checklistItem.id] = this.appendNewItem(checklistItem);
      this.updateChecklistProgress();
    },

    onModelRemove: function() {
      this.close();
    },

    appendNewItem: function(checklistItem) {
      var view = new cantas.views.ChecklistItemView({
        model: checklistItem,
        parentView: this
      });
      this.$el.find("ul.js-items").append(view.render().el);
      return view;
    },

    /*** Response to DOM events ***/

    onDeleteClick: function(event) {
      if (this.model === null) {
        return;
      }
      if (!cantas.utils.getCurrentBoardView().confirmDialogView) {
        cantas.utils.getCurrentBoardView().confirmDialogView = new cantas.views.ConfirmDialogView();
      }
      var checklistSectionView = this.options.parentView;
      if (checklistSectionView.isConfirmDeleteChecklist) {
        $(event.target.parentNode).focus();
        this.confirmDeleteChecklist(event);
        $(".modal-scrollable").on("scroll",
          function() {
            $("body").click();
          });
      } else {
        this.removeChecklist();
      }
    },

    confirmDeleteChecklist: function(event) {
      event.stopPropagation();

      $("body").click();

      var self = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "delete",
        operationItem: "checklist",
        confirmInfo: "Are you sure to delete this checklist?",
        captionYes: "Delete",
        yesCallback: function() {
          self.removeChecklist();

          if ($("#js-cb-noask:checked").length > 0) {
            self.options.parentView.isConfirmDeleteChecklist = false;
          }

          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        pageX: event.pageX - 285,
        pageY: event.pageY
      });
    },

    removeChecklist: function() {
      this.$el.fadeOut();
      this.removeChecklistItems();
      this.model.destroy();
    },

    removeChecklistItems: function() {
      var deleteItems = {};
      var removeChecklistItems = this.model.itemCollection;
      removeChecklistItems.forEach(function(item, index) {
        deleteItems[index] = item;
      });
      var index;
      for (index in deleteItems) {
        if (deleteItems.hasOwnProperty(index)) {
          deleteItems[index].destroy();
        }
      }
    },

    onAddItemClick: function(event) {
      $(event.target).parent().hide();
      this._addNewItem();
    },

    addNewItem: function() {
      this.$el.find(".js-add-item a").trigger("click");
    },

    onFoldItems: function() {
      this.$el.find("ul").toggle("fade");
      this.$el.find("a.js-fold-items").toggleClass("fold");
    },

    /*** Response to Backbone events ***/

    onChecklistItemRemoved: function(model, collection, options) {
      this.updateChecklistProgress();
    },

    /*
     * Real function to show input area to allow user to add new checklist item.
     */
    _addNewItem: function() {
      if (this.$('ul.js-item-entryview div.card-option-edit').length === 0) {
        var inputView = new cantas.views.ChecklistItemInputView({
          model: null,
          parentView: this
        });
        this.$el.find("ul.js-item-entryview").append(inputView.render().el);
        inputView.focus();
      } else {
        this.$('ul.js-item-entryview div.card-option-edit textarea').focus();
      }
    },

    updateChecklistProgress: function() {
      var iCompletedNumber = this.model.itemCollection.where({checked: true}).length;
      var iTotalNumber = this.model.itemCollection.length;
      var fPercentage = 0;
      this.$el.find('a.js-fold-items').show();
      if (iTotalNumber === 0) {
        this.$el.find('a.js-fold-items').hide();
      }
      if (iTotalNumber > 0) {
        fPercentage = Math.round(iCompletedNumber / iTotalNumber * 100);
      }
      this.$el.find(".checklist-title .progress .bar").width(fPercentage + "%");
      this.$el.find(".checklist-title .progress .bar a").text(fPercentage + "%");
    }
  });

  /*
   * View to show each checklist item.
   *
   * View needs a model of checklist item to show each existing item.
   */
  cantas.views.ChecklistItemView = cantas.views.BaseView.extend({
    tagName: "li",
    template: jade.compile($("#template-card-checkitem").text()),

    events: {
      "click .js-item-checkbox": "toggleItemDone",
      "click .js-check-item-text": "onEditCheckitemClick",
      "click .js-item-delete": "onDeleteItemClick"
    },

    initialize: function() {
      this.model.on("change:checked", this.checkedChanged, this);
      this.model.on("change:content", this.render, this);
      this.model.on('remove', this.onModelRemove, this);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      if (this.model.get("checked")) {
        this.$el.addClass("checked");
      }
      if (!window.cantas.isBoardMember) {
        this.undelegateEvents();
        this.$el.find('a.js-item-delete').hide();
      }
      return this;
    },


    onModelRemove: function() {
      this.close();
    },

    onEditCheckitemClick: function() {
      var inputView = new cantas.views.ChecklistItemInputView({
        model: this.model,
        parentView: this.options.parentView
      });

      var $checkItem = this.$el;
      $checkItem.hide();
      $checkItem.after(inputView.render().el);
    },

    confirmDeleteChecklistItem: function(event) {
      event.stopPropagation();

      $("body").click();

      var self = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "delete",
        operationItem: "checklist item",
        confirmInfo: "Are you sure to delete this checklist item?",
        captionYes: "Delete",
        yesCallback: function() {
          self.removeChecklistItem();

          if ($("#js-cb-noask:checked").length > 0) {
            self.options.parentView.isConfirmDeleteChecklistItem = false;
          }

          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        pageX: event.pageX - 285,
        pageY: event.pageY
      });
    },

    /*
     * pop up a dialog to confirm deleting the checklist item or not.
     */
    onDeleteItemClick: function(event) {
      if (this.model === null) {
        return;
      }

      if (!cantas.utils.getCurrentBoardView().confirmDialogView) {
        cantas.utils.getCurrentBoardView().confirmDialogView = new cantas.views.ConfirmDialogView();
      }
      var checklistView = this.options.parentView;
      if (checklistView.isConfirmDeleteChecklistItem) {
        $(event.target.parentNode).focus();
        this.confirmDeleteChecklistItem(event);
        $(".modal-scrollable").on("scroll",
          function() {
            $("body").click();
          });
      } else {
        this.removeChecklistItem();
      }
    },

    removeChecklistItem: function() {
      this.$el.fadeOut();
      this.model.destroy();
    },

    toggleItemDone: function() {
      // only board members can do this.
      var checked = !this.model.get("checked");
      var originCheckStatus = this.model.get("checked");
      this.model.patch({
        checked: checked,
        original: {checked: originCheckStatus}
      });
    },

    checkedChanged: function(data) {
      this.$el.toggleClass("checked");
      this.options.parentView.updateChecklistProgress();
    }

    // close: function() {
    //   this.model = null;
    //   var parent = cantas.views.BaseView;
    //   parent.prototype.close.apply(this, arguments);
    // }
  });

  cantas.views.ChecklistItemInputView = cantas.views.ChecklistItemView.extend({
    tagName: "li",

    events: {
      "click .js-convert-item-to-card": "convertToCard"
    },

    initialize: function() {
      this.inputView = new cantas.views.EntryView({
        placeholder: "Item content",
        buttons: [{
          name: "confirm",
          eventHandler: this.onConfirmClick,
          data: {
            checklistView: this.options.parentView,
            parentView: this
          }
        }, {
          name: "cancel",
          eventHandler: this.onCancelClick,
          data: {
            // Show the Add Item after close new item entry view.
            checklistView: this.options.parentView,
            // Remove current item input view if user do not want to enter any
            // checklist item.
            parentView: this
          }
        }]
      });
    },

    focus: function() {
      this.inputView.focus();
    },

    render: function() {
      this.$el.html(this.inputView.render().el);

      if (this.model !==  null) {
        var itemContent = this.model.get("content");
        var updateOn = this.model.get('updatedOn');
        var createOn = this.model.get('createdOn');
        var moreActionHtml = "<a class='js-convert-item-to-card'>Convert to Card</a>";
        createOn = cantas.utils.formatDate(createOn);
        updateOn = cantas.utils.formatDate(updateOn);
        this.$el.find('div.js-create-time').text('Creation:  ' + createOn);
        if (updateOn !== createOn) {
          this.$el.find('div.js-modify-time').text('Last Modified:  ' + updateOn);
        }
        this.$el.find('textarea').val(itemContent);
        this.$el.find('.js-entryview-cancel').after(moreActionHtml);
      }

      return this;
    },

    // This handler runs within EntryView context.
    onConfirmClick: function(event, data) {
      var content = data.entryView.getText();
      if (content.length === 0) {
        return;
      }

      if (data.parentView.model !== null) {
        if (content === data.parentView.model.attributes.content) {
          data.checklistView.itemViews[data.parentView.model.id].$el.show();

          data.entryView.remove();
          data.parentView.remove();
        } else {
          var originContent = data.parentView.model.get('content');
          data.parentView.model.patch({
            'content': content,
            original: {content: originContent}
          });
          data.checklistView.itemViews[data.parentView.model.id].$el.show();

          data.entryView.remove();
          data.parentView.remove();
        }
      } else {
        var checklistItem = new cantas.models.ChecklistItem({
          content: content,
          checklistId: data.checklistView.model.id,
          cardId: data.checklistView.model.get("cardId"),
          authorId: cantas.utils.getCurrentUser().id
        });
        checklistItem.save();
        data.entryView.$el.find('textarea').val('');
      }
    },

    // This handler runs within EntryView context.
    onCancelClick: function(event, data) {
      if (data.parentView.model !== null) {
        data.checklistView.itemViews[data.parentView.model.id].$el.show();
      }
      data.entryView.remove();
      data.parentView.remove();
      if (data.checklistView.$('ul.js-item-entryview div.card-option-edit').length === 0) {
        data.checklistView.$el.find("li.js-add-item").show();
      }
    },

    convertToCard: function() {
      if (this.model === null) {
        return;
      }

      var content = this.model.get('content');
      var cardModel = this.options.parentView.options.card;
      var listId = cardModel.get("listId");
      var boardId = cardModel.get("boardId");
      var cardCollection = cantas.utils.getCurrentBoardModel()
                            .listCollection.get(listId).cardCollection;
      var order = cantas.utils.calcPos(cardCollection);
      var newCard = new cantas.models.Card({
        title: content,
        creatorId: cantas.utils.getCurrentUser().id,
        listId: listId,
        boardId: boardId,
        order: order,
        sourceObject: {
          model: this.model.urlRoot,
          id: this.model.id,
          title: content
        }
      });
      newCard.save();

      this.model.destroy();
      this.remove();
    }
  });

}(jQuery, _, Backbone));
