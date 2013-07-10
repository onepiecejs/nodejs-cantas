describe('sycnCardBadges',function(){
  var view;
  var badges = {
    comments: 1,
    checkitemsChecked: 2,
    checkitems: 3
  };


  beforeEach(function(){
    $('<div class="list-content"></div>').appendTo('body');
    loadFixtures('cardBadges.html');

    var card = new cantas.models.Card({
      title: "test card badges",
      assignees: [],
      badges: badges
    });

    view = new cantas.views.CardView({
      model: card,
      attributes: {index: 1}
    });

    view.template = jade.compile($("#template-card-view").text());
    $(".list-content").append(view.render().el);
  });

  afterEach(function() {
    $('.list-content').empty();
  });

  it('should show card view with badges', function(){
    var expectedCommentBadge = badges.comments.toString();
    var expectedChecklistBadge = badges.checkitemsChecked + '/' + badges.checkitems;

    // card view shown as expected
    expect($('body').find('.list-content').find('.list-card').length).toEqual(1);

    // comments badge shown as expected
    expect($('body').find('.list-content').find('.list-card')
      .find('.card-items').find('.card-comment').html()
      ).toEqual(expectedCommentBadge);

    // checklist items badge shown as expected
    expect($('body').find('.list-content').find('.list-card')
      .find('.card-items').find('.card-checklist').html()
      ).toEqual(expectedChecklistBadge);
  });

  it('should update comments badge', function(){
    badges.comments = 5;
    var expectedCommentBadge = badges.comments.toString();

    view.model.set(badges);

    // wait 1 second to update comments badge
    setTimeout(function(){
      expect($('body').find('.list-content').find('.list-card')
        .find('.card-items').find('.card-comment').html()
        ).toEqual(expectedCommentBadge);
    }, 1000);
  });

  it('should update checklist items badge', function(){
    badges.checkitems = 10;
    badges.checkitemsChecked = 3;
    var expectedChecklistBadge = badges.checkitemsChecked + '/' + badges.checkitems;

    view.model.set(badges);

    // wait 1 second to update checklist items badge
    setTimeout(function(){
      expect($('body').find('.list-content').find('.list-card')
        .find('.card-items').find('.card-checklist').html()
        ).toEqual(expectedChecklistBadge);
    }, 1000);
  });

});
