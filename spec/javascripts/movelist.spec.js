describe('MoveListToView',function(){
  var view;

  beforeEach(function(){
    $('<div class="window-overlay" style="display:none"></div>').appendTo('body');
    loadFixtures('movelist.html');
    view  = new cantas.views.MoveListToView({
      title: 'Move List',
      listId: "5195d6bc07eec66c36000014",
      boardId: "51b97050240934cf2f000005"
    });

    view.template = jade.compile($("#template-move-to").text());
    view.render();
  });

  afterEach(function() {
    $('.window-overlay').empty();
  });

  it('should showing move listTo view', function(){
    expect($('body').find('.window-overlay')).not.toBeHidden();
    expect($('body').find('.window-overlay').find('.modal-header > h3')).toHaveText("Move To");
  });

});
