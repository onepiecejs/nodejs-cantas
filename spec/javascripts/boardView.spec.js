describe("PublicBoardMemberTest", function () {
  var isMember = true,
    board,
    visitors,
    boardView,
    activityCollection,
    activityCollectionView,
    boardActiveUserView;
  window.cantas.isBoardMember = isMember;

  beforeEach(function () {
    $('<div class="content"></div>').appendTo('body');
    loadFixtures("boardView.html");

    board = new cantas.models.Board({
      _id: "51c2adf162c1edba14000070",
      creatorId: "51c2adf162c1edba14000070",
      title: "Public Board for testing",
      description: "Board description",
      isClosed: false,
      isPublic: true
    });
    visitors = [];
    boardView = new cantas.views.BoardView({
      el: $('.content'),
      model: board,
      isMember: isMember,
      visitors: new cantas.models.BoardVisitorCollection(visitors)
    });
    cantas.appRouter.currentView = boardView;
    activityCollection = new cantas.models.ActivityCollection();
    activityCollectionView = new cantas.views.ActivityCollectionView({
      collection: activityCollection
    });
    boardActiveUserView = new cantas.views.BoardActiveUserCollectionView({
      collection: new cantas.models.BoardVisitorCollection(visitors),
      boardId: board._id
    });

    boardView.template = jade.compile($("#template-board-view").text());
    boardView.render();
  });

  it("Board-member can edit board title", function () {
    boardView.$el.find(".js-edit-board-title").trigger("click");
    expect(boardView.$el.find('.board-title-edit')).toExist();
  });
  it("Board-member can edit board description", function () {
    expect(boardView.$el.find('.board-info')).not.toHaveCss({display: "none"});
    boardView.$el.find('.board-info').trigger("click");
    expect(boardView.$el.find('#board-description')).toHaveClass('hide');
  });
  it("Board-member can set board to private", function () {
    expect(boardView.$el.find('.js-select-private')).not.toHaveCss({display: "none"});
    boardView.$el.find(".js-select-private").trigger("click");
    expect(boardView.$el.find('.js-select-private')).toHaveClass('active');
  });
  it("Board-member can do board settings", function () {
    expect(boardView.$el.find('.js-toggle-board-menu')).not.toHaveCss({display: 'none'});
    //TODO(xchu): Need to go a litter deeper to find out why this not work.
    //expect(boardView.$el.find('.board-menu')).not.toBeVisible();
    //boardView.$el.find('.js-toggle-board-menu').trigger('click');
    //expect(boardView.$el.find('.board-menu')).toBeVisible();
  });
  it("Board-member can new list", function () {
    spyOn(boardView.addListView, 'render');
    boardView.$el.find('.js-add-list').trigger('click');
    expect(boardView.addListView.render).toHaveBeenCalled();
    $('.board-content').trigger('dblclick');
    expect(boardView.addListView.render).toHaveBeenCalled();
  });
  xit("Board-member can edit list name", function () {
    //TODO(xchu): this should be tested in ListView.
    expect(boardView.$el.find('.js-list-title')).toExist();
  });
});

describe("PublicBoardNonMemberTest", function () {
  var isMember = false,
    board,
    visitors,
    boardView,
    activityCollection,
    activityCollectionView,
    boardActiveUserView;
  window.cantas.isBoardMember = isMember;

  beforeEach(function () {
    $('<div class="content"></div>').appendTo('body');
    loadFixtures("boardView.html");

    board = new cantas.models.Board({
      _id: "51c2adf162c1edba14000070",
      creatorId: "51c2adf162c1edba14000070",
      title: "Public Board for testing",
      description: "Board description",
      isClosed: false,
      isPublic: true
    });
    visitors = [];
    boardView = new cantas.views.BoardView({
      el: $('.content'),
      model: board,
      isMember: isMember,
      visitors: new cantas.models.BoardVisitorCollection(visitors)
    });
    cantas.appRouter.currentView = boardView;
    activityCollection = new cantas.models.ActivityCollection();
    activityCollectionView = new cantas.views.ActivityCollectionView({
      collection: activityCollection
    });
    boardActiveUserView = new cantas.views.BoardActiveUserCollectionView({
      collection: new cantas.models.BoardVisitorCollection(visitors),
      boardId: board._id
    });

    boardView.template = jade.compile($("#template-board-view").text());
    boardView.render();
  });

  it("Non-board-member cannot edit board title", function () {
    boardView.$el.find(".js-edit-board-title").trigger("click");
    expect(boardView.$el.find('.board-title-edit')).not.toExist();
  });
  it("Non-board-member cannot edit board description", function () {
    expect(boardView.$el.find('.board-info')).toHaveCss({display: "none"});
  });
  it("Non-board-member cannot set board to private", function () {
    expect(boardView.$el.find('.js-select-private')).toHaveCss({display: "none"});
  });
  it("Non-board-member cannot do board settings", function () {
    expect(boardView.$el.find('.js-toggle-board-menu')).toHaveCss({display: 'none'});
  });
  it("Non-board-member cannot new list", function () {
    expect(boardView.$el.find('button.js-add-list')).toHaveCss({display: 'none'});
  });
  xit("Non-board-member cannot edit list name", function () {
    //TODO(xchu): should tested in ListView.
    expect(true).toBe(true);
  });
});
