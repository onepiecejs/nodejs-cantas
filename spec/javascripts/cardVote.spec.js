describe("updateCardVoteTest", function() {
  var board;
  var boardView;
  var cardVote;
  var cardVoteView;
  var cardVoteCollection;

  beforeEach(function(){
    $('<div class="window-vote"></div>').appendTo('body');
    board = new cantas.models.Board({
      _id: '51c2adf162c1edba14000071',
      creatorId: '51c2adf162c1edba14000070',
      title: 'Public Board for testing',
      description: 'Board description',
      isClosed: false,
      isPublic: true,
      voteStatus: 'opened'
    });

    boardView = new cantas.views.BoardView({
      model: board,
      isMember: true,
      visitors: new cantas.models.BoardVisitorCollection([])
    });

    cardVoteCollection = new cantas.models.VoteCollection();

    cardVote = new cantas.models.Vote({
      cardId: '51c2adf162c1edba14000011',
      authorId: '51c2adf162c1edba14000070'
    });

    cardVoteCollection.add(cardVote);

    cardVoteView = new cantas.views.CardVoteView({
      collection: cardVoteCollection,
      card: new cantas.models.Card({
        _id: '51c2adf162c1edba14000011',
        title: 'test-card',
        creatorId: '51c2adf162c1edba14000070',
        description: 'description of card',
        boardId: '51c2adf162c1edba14000071',
        assignees: []
      })
    });

    loadFixtures('cardVote.html');

    spyOn(cantas.utils, 'getCurrentUser').andCallFake(function() {
      var user = {};
      user.id = '51c2adf162c1edba14000070';
      return user;
    });

    cantas.appRouter.currentView = boardView;
    cardVoteView.template = jade.compile($("#template-card-vote-view").text());
    cardVoteView.render().$el.appendTo('body');

  });

  it("the agree button should be checked and unchecked", function() {
    cardVoteView.$el.find("a.js-vote-agree").trigger("click");
    expect(cardVoteView.$el.find("a.js-vote-agree")).toHaveClass('checked');
    cardVoteView.$el.find("a.js-vote-agree").trigger("click");
    expect(cardVoteView.$el.find("a.js-vote-agree")).not.toHaveClass('checked');
  });

  it("the disagree button should be checked and unchecked", function() {
    cardVoteView.$el.find("a.js-vote-disagree").trigger("click");
    expect(cardVoteView.$el.find("a.js-vote-disagree")).toHaveClass("checked");
    cardVoteView.$el.find("a.js-vote-disagree").trigger("click");
    expect(cardVoteView.$el.find("a.js-vote-disagree")).not.toHaveClass('checked');
  });

  afterEach(function() {
    cardVoteView.remove();
    $('div.window-vote').empty();
  });
});