describe('Board permissions widget test', function() {
  var boardModel;
  var widget;

  beforeEach(function() {
    $('<div class="widget-container"></div>').appendTo('body');
    
    boardModel = new cantas.models.Board({
      exampleStatus: 'enabled' // Should be able to work with any key on the model
    });

    widget = new cantas.views.PermissionWidgetView({
      el: '.widget-container',
      model: boardModel,
      key: 'exampleStatus'
    });

    loadFixtures('permissionWidget.html');
    widget.template = jade.compile($('#template-permission-widget-view').text());
    widget.render();

    spyOn(boardModel, 'patch').and.callFake(function() {});
  });

  afterEach(function() {
    widget.close();
  });

  it("Should default status to enabled", function() {
    expect($('[data-permission="enabled"]')).toHaveClass('checked');
  });

  it('Should call patch on the model when setting to disabled', function() {
    widget.$('[data-permission="disabled"]').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });

  it("Should call patch on the model when setting to opened", function() {
    widget.$('[data-permission="opened"]').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });


});
