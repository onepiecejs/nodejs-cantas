describe('Comment configuration test', function() {
  var boardModel;
  var commentConfig;

  beforeEach(function() {
    $('<dl class="js-comment"></dl>').appendTo('body');
    boardModel = new cantas.models.Board({ commentStatus: 'enabled' });
    commentConfig = new cantas.views.CommentConfig({
      el: 'dl.js-comment',
      model: boardModel
    });

    loadFixtures('commentConfig.html');
    commentConfig.template = jade.compile($('#template-comment-config-view').text());
    commentConfig.render();

    spyOn(boardModel, 'patch').andCallFake(function() {});
  });

  afterEach(function() {
    commentConfig.close();
  })

  it("default comment status should be enabled", function() {
    expect($('.js-enable-comment')).toHaveClass('checked');
  });

  it('Should call patch method when disable comment', function() {
    commentConfig.$('.js-disable-comment span:last').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });

  it("Should call patch method when open comment", function() {
    commentConfig.$('.js-open-comment span:last').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });


});
