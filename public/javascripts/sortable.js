// Element sortable initialized funciton
var SORTABLE = (function (my) {

  // initialize constant
  my.sorting = false;
  $(document).mousemove(function (evt) {
    my.mouseX = evt.pageX;
    return my.mouseY = evt.pageY;
  });

  // refresh position by sortable api
  my.refreshPositions = function() {
    $(".board").sortable('refreshPositions');
    return $(".connectedSortable").sortable('refreshPositions');
  }

  // freshListSortable
  my.refreshListSortable = function() {
    $(".board").sortable({
      appendTo: "#wrapper",
      placeholder: "ui-state-highlight-list",
      tolerance: "pointer",
      revert: "100",
      handle:".list-header",
      delay: "75",
      distance: "7",
      scroll: false,
      helper: 'clone',
      start: function(event, ui) {
        var thatWidth = ui.helper.width();
        var thatHeight = ui.helper.height() * 0.9 ;
        $(ui.placeholder).width(thatWidth).height(thatHeight);
        // creates a temporary attribute on the element with the old index
        $(this).attr('data-previndex', ui.item.index());
        my.sorting = true;
        my.scrollWhileSorting();
      },
      stop: function(event, ui) {
        event.stopPropagation();
        var newIndex = ui.item.index();
        var oldIndex = $(this).attr('data-previndex');
        $(this).removeAttr('data-previndex');
        ui.item.trigger('listdrop', [newIndex, oldIndex]);

        return _.defer(function () {
          return my.sorting = false;
        })
      }
    });
    return $(".board").sortable("refresh");
  };

  //refreshCardSortable
  my.refreshCardSortable = function() {
    $(".connectedSortable").sortable({
      connectWith: ".connectedSortable",
      revert: "100",
      appendTo: "#wrapper",
      tolerance: "pointer",
      placeholder: "ui-state-highlight",
      delay: "75",
      distance: "7",
      items: ".js-list-card",
      scroll: false,
      helper: 'clone',
      start: function(event, ui) {
        my.sorting = true;
        var cardHeight = ui.helper.height() + 2;
        $(ui.placeholder).height(cardHeight);
        my.scrollWhileSorting();
      },
      stop: function(event) {
        event.stopPropagation();
        setTimeout(function () {
          return my.sorting = false;
        }, 50);
        return my.scrollList = null;
      },
      over: function (event, ui) {
        return my.scrollListFromUI(ui)
      }
    });
    return $(".connectedSortable").sortable("refresh");
  };

  //private methods for scroll
  my.scrollWhileSorting = function () {
    if (my.sorting) {
      var board = $('.board');
      var left = board.offset().left + 30;
      var right = board.offset().left + board.width() - 30;
      var listTop = board.offset().top + 30;
      var listHeight = board.offset().top + board.height() - 30;

      if (my.mouseX < left) {
        var scrollleftvar = board.scrollLeft();
        board.scrollLeft( scrollleftvar - 15);
      }
      else if (my.mouseX > right) {
        var scrollleftvar = board.scrollLeft();
        board.scrollLeft( scrollleftvar + 15);
      }
      else if (my.scrollList != null && my.scrollList.scrollTop != null) {
        my.mouseY < listTop ? my.scrollList.scrollTop -= 15 :
          my.mouseY > listHeight && (my.scrollList.scrollTop += 15);
      }
      return setTimeout(my.scrollWhileSorting, 20);
    }
  };

  my.scrollListFromUI = function (ui) {
    if (ui != null && ui.placeholder != null) {
      my.scrollList = ui.placeholder.parents(".list-content")[0];
      return my.scrollList;
    }
  };

  return my;
}(SORTABLE || {}));
