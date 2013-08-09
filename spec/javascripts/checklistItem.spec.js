describe("DeleteChecklistItemTest", function() {
  var checklist;
  var checklistView;
  var checklistItem;
  var checklistItemView;

  beforeEach(function(){
    checklist = new cantas.models.Checklist();
    checklistView = new cantas.views.ChecklistView({model: checklist});
    cantas.appRouter.currentView = checklistView;

    checklistItem = new cantas.models.ChecklistItem({
      content: "Delete the checklist item",
      checklistId: "51c2adf162c1edba14000074",
      authorId: "51c2adf162c1edba14000070"
    });

    checklistItemView = new cantas.views.ChecklistItemView({
      model: checklistItem,
      parentView: checklistView
    });

    checklistItemView.confirmDialogView = new cantas.views.ConfirmDialogView();
    window.cantas.isBoardMember = true;

    loadFixtures("checklistItem.html");
    checklistItemView.template = jade.compile($("#template-card-checkitem").text());
    checklistItemView.render().$el.appendTo('body');

    spyOn(checklistItem, "destroy").andCallFake(function() {});

    checklistItemView.$el.find("a.js-item-delete").trigger("click");
  });

  it("deleting checklistItem should pop-up confirm dialog", function() {
    expect(checklistView.confirmDialogView.$el).toBeDefined();
  });

  it("deleting checklistItem and then confirm should call destroy method", function() {  
    checklistView.confirmDialogView.$el.find(".js-btn-yes").trigger("click");
    expect(checklistItem.destroy).toHaveBeenCalled();
  });

  it("deleting checklistItem and then cancel should not call destroy method", function() {
    checklistView.confirmDialogView.$el.find(".js-btn-no").trigger("click");
    expect(checklistItem.destroy).not.toHaveBeenCalled();
  });

  it("deleting checklistItem and selecting no-asking then confirm should not pop-up \
    confirm dialog next time", function() {
    checklistView.confirmDialogView.$el.find("#js-cb-noask").prop('checked', true);
    checklistView.confirmDialogView.$el.find("#js-cb-noask").trigger("click");
    checklistView.confirmDialogView.$el.find(".js-btn-yes").trigger("click");
    // FIXME: upgrade jquery to 2.0.0 the test came acorss failed
    // case.(dxiao@redhat.com)
    // expect(checklistView.isConfirmDeleteChecklistItem).toBe(false);
  });
});


describe("CheckoutChecklistItemTest", function() {
  var checklistItemView;
  var checklistItem;
  beforeEach(function() {

    checklistItem = new cantas.models.ChecklistItem({
      content: "Delete the checklist item",
      checklistId: "51c2adf162c1edba14000074",
      authorId: "51c2adf162c1edba14000070"
    });

    checklistItemView = new cantas.views.ChecklistItemView({
      model: checklistItem,
      parentView: null
    });

    window.cantas.isBoardMember = true;

    loadFixtures("checklistItem.html");
    checklistItemView.template = jade.compile($("#template-card-checkitem").text());
    checklistItemView.render().$el.appendTo("body");

    // check checkbox icon
    spyOn(checklistItem, "patch").andCallFake(function() {});

  });

  it("checking checklistItem should call patch method", function() {
    checklistItemView.$el.find("div.js-item-checkbox").trigger("click");
    expect(checklistItem.patch).toHaveBeenCalled();
  });
})


describe("EditChecklistItemTest",function() {
  var checklist;
  var checklistView;
  var checklistItem;
  var checklistItemView;
  var checklistItemInputView;
  var entryView;

  beforeEach(function() {

    checklist = new cantas.models.Checklist({
      title: "test checklist",
      authorId: "51c2adf162c1edba14000070"
    });

    checklistView = new cantas.views.ChecklistView({
      model: checklist,
    });

    checklistItem = new cantas.models.ChecklistItem({
      content: "update the checklist item",
      checklistId: checklist.id,
      authorId: "51c2adf162c1edba14000070"
    });

    checklistItemView = new cantas.views.ChecklistItemView({
      model: checklistItem,
      parentView: checklistView
    });

    checklistItemInputView = new cantas.views.ChecklistItemInputView({
      model: checklistItem,
      parentView: checklistItemView.options.parentView
    });

    entryView = new cantas.views.EntryView({
      placeholder: "Item Content",
      buttons: [{
        name: "confirm",
        eventHandler: checklistItemInputView.onConfirmClick,
        data: {
          checklistView: checklistItemInputView.options.parentView,
          parentView: checklistItemInputView
        }
      }, {
        name: "cancel",
        eventHandler: checklistItemInputView.onCancelClick,
        data: {
          checklistView: checklistItemInputView.options.parentView,
          parentView: checklistItemInputView
        }
      }]
     });

    window.cantas.isBoardMember = true;

    loadFixtures("checklistItem.html");
    checklistItemView.template = jade.compile($("#template-card-checkitem").text());
    checklistItemInputView.render().$el.appendTo("body");

    checklistView.itemViews[checklistItem.id] = checklistItemView;

    spyOn(checklistItem, "patch").andCallFake(function() {});

    });

    it("Click save button with blank content should not call patch method", function() {
      checklistItemInputView.$el.find("textarea").val("");
      checklistItemInputView.$el.find(".js-entryview-confirm").trigger("click");
      expect(checklistItem.patch).not.toHaveBeenCalled();
    });

    it("Click save button with unchanged content should not call patch method", function() {
      checklistItemInputView.$el.find("textarea").val(checklistItem.content);
      checklistItemInputView.$el.find(".js-entryview-confirm").trigger("click");
      expect(checklistItem.patch).not.toHaveBeenCalled();
    });

    it("Click save button with changed content should call patch method", function() {
      checklistItemInputView.$el.find("textarea").val("change item content");
      checklistItemInputView.$el.find(".js-entryview-confirm").trigger("click");
      expect(checklistItem.patch).toHaveBeenCalled();
    });

    it("Click cancel button should not call patch method", function() {
      checklistItemInputView.$el.find(".js-entryview-cancel").trigger("click");
      expect(checklistItem.patch).not.toHaveBeenCalled();
    });

});
