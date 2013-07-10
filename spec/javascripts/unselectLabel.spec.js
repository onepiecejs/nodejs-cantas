describe('unselectLabel',function(){
  var labelAssignView;
  var template_data;
  var relation;
  beforeEach(function(){
    $('<div class="window-label"></div>').appendTo('body');

    labelAssignView = new cantas.views.LabelAssignView({
      collection: new cantas.models.CardLabelRelationCollection,
      card: new cantas.models.Card({
        title: 'good luck',
        creatorId: '516f593cbd645e7306000001',
        listId: '51cb97495bffe9ba08000003',
        boardId: '51cb97495bffe9ba08000001'
      })
    });
  
    loadFixtures('unselectLabel.html');
    labelAssignView.template = jade.compile($('#template-label-assign-view').text());
    template_data = {relations: [{
      _id: '51cb974c5bffe9ba08000011',
      color: '#E7BAB6',
      selected: true
    }]};

    labelAssignView.$el.html(labelAssignView.template(template_data)).appendTo('body');

    relation = new cantas.models.CardLabelRelation({
      _id: '51cb974c5bffe9ba08000011',
      boardId: '51cb97495bffe9ba08000001',
      cardId: '51cb974c5bffe9ba0800000f',
      labelId: '51cb97495bffe9ba08000007',
      selected: true
    });

    labelAssignView.collection = new cantas.models.CardLabelRelationCollection([relation]);

    spyOn(relation, "patch").andCallFake(function() {});
  });

  it('should unselect the label by click the lable with √', function(){ 
    labelAssignView.$('ul.label-items').children().eq(0).trigger('click');
    expect(relation.patch).toHaveBeenCalled();
  });

});