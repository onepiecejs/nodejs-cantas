describe('generateLabelCorrectly',function(){
  var labelNeonLightsView;

  beforeEach(function(){

    labelNeonLightsView = new cantas.views.LabelNeonLightsView({
      className: 'card-filter clearfix',
      collection: new cantas.models.CardLabelRelationCollection([
        new cantas.models.CardLabelRelation({
          boardId: '51cb97495bffe9ba08000001',
          cardId: '51cb974c5bffe9ba0800000f',
          labelId: (new cantas.models.Label({
            title: 'good luck',
            order: '1',
            color: '#E7BAB6',
            boardId: '51cb97495bffe9ba08000001'
          })).toJSON(),
          selected: true
        }),
        new cantas.models.CardLabelRelation({
          boardId: '51cb97495bffe9ba08000001',
          cardId: '51cb974c5bffe9ba0800000f',
          labelId: (new cantas.models.Label({
            title: 'bad luck',
            order: '1',
            color: '#E7BAB6',
            boardId: '51cb97495bffe9ba08000001'
          })).toJSON(),
          selected: false
        })
      ]),
      card: null
    });

    loadFixtures('labelNeonlights.html');
    labelNeonLightsView.template = jade.compile($("#template-card-labels-neonlights").text());
    labelNeonLightsView.render().$el.appendTo('body');

  });

  it('should generate correct title of label', function(){
    expect(labelNeonLightsView.$('div.clabel')).toHaveProp('title', 'good luck');
  });

  it('should generate correct color of label', function(){
    expect(labelNeonLightsView.$('div.clabel').css('background-color')).toEqual('rgb(231, 186, 182)');
  });

   it('should not generate the second label neon light', function(){
    expect(labelNeonLightsView.$('div.clabel').eq(1).length).toEqual(0);
  });

});