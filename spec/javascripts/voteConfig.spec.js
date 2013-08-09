describe('Vote configuration Test', function() {
  var boardModel;
  var voteConfig;

  beforeEach(function() {
    $('<dl class="js-vote"></dl>').appendTo('body');
    boardModel = new cantas.models.Board({ voteStatus: 'enabled' });
    voteConfig = new cantas.views.VoteConfig({
      el: 'dl.js-vote',
      model: boardModel
    });

    loadFixtures('voteConfig.html');
    voteConfig.template = jade.compile($('#template-vote-config-view').text());
    voteConfig.render();

    spyOn(boardModel, 'patch').andCallFake(function() {});
  });

  afterEach(function() {
    voteConfig.close();
  })

  it("default vote status should be enabled", function() {
    expect($('.js-enable-vote')).toHaveClass('checked');
  });

  it('Should call patch method when disable vote', function() {
    voteConfig.$('.js-disable-vote span:last').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });

  it("Should call patch method when open vote", function() {
    voteConfig.$('.js-open-vote span:last').trigger('click');
    expect(boardModel.patch).toHaveBeenCalled;
  });


});
