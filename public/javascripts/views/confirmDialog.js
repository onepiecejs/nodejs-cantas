// Confirm Dialog View

$(function ($, _, Backbone) {
  "use strict";

  cantas.views.ConfirmDialogView = Backbone.View.extend({
    tagName: "div",
    id: "confirm-dialog",
    className: "alert-window clearfix",
    template: _.template('<p class="js-confirmInfo"></p>' +
        '<div class="div.alert-checkbox">' +
        '<label class="checkbox inline" for="js-cb-noask">' +
        '<input type="checkbox" id="js-cb-noask" />' +
        'No more asking</label>' +
        '</div>' +
        '<button class="btn btn-primary js-btn-yes">Yes</button>' +
        '<button class="btn js-btn-no">No</button>'),

    initialize: function () {
      //when clicking outside area of the confirm dialog, it will disappear.
      $("body").on("click", function (event) {
        var e = event || window.event;
        var elem = e.srcElement || e.target;
        while(elem && elem !== $("body")[0]) {
          if(elem.id == "confirm-dialog") {
            return;
          }
          elem = elem.parentNode;
        }
        $("#confirm-dialog").hide();
      });
    },

    render: function(context) {
      $("body").append(this.$el.html(this.template()));
      this.operationType = context.operationType;
      this.operationItem = context.operationItem;
      this.$el.find(".js-confirmInfo").text(context.confirmInfo);
      this.$el.find(".js-btn-yes").text(context.captionYes);
      this.$el.find(".js-btn-yes").on("click",context.yesCallback);
      this.$el.find(".js-btn-no").text(context.captionNo);
      this.$el.find(".js-btn-no").on("click",context.noCallback);

      var offsetX = cantas.utils.getOffsetX(context.pageX, "#confirm-dialog");
      var offsetY = cantas.utils.getOffsetY(context.pageY, "#confirm-dialog");
      this.$el.css({"left": (context.pageX - offsetX), "top": (context.pageY - offsetY)});
      this.$el.toggle();
      return this;
    }

  });

}(jQuery, _, Backbone));
