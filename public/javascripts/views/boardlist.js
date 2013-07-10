// User Default View

$(function ($, _, Backbone) {
  "use strict";

  cantas.views.BoardsView = Backbone.View.extend({
    el: '.content',

    events: {
      "click .js-close-board": "closeBoard"
    },

    template: jade.compile($("#template-board-list-view").text()),

    closeBoard: function(evt) {
      var boardId = $(evt.target).data('board');
      var board = new cantas.models.Board({ _id: boardId});
      board.patch({'isClosed': true}, {validate:false});

      $(evt.target).closest('li').fadeOut('slow', function() {
        $(evt.target).closest('li').remove();
      });
    },

    remove: function(){
      this.undelegateEvents();
      this.$el.empty();
      this.stopListening();
      return this;
    },

    render: function(context) {
      var h3Header;
      switch(context.title){
        case 'mine':
          h3Header = 'My Boards';
          break;
        case 'public':
          h3Header = 'Public Boards';
          break;
        case 'closed':
          h3Header = 'Closed Boards';
          break;
      }
      this.$el.html(this.template({boards: context.boards, h3Header: h3Header}));
      cantas.setTitle(context.title);
    }
  });

}(jQuery, _, Backbone));

