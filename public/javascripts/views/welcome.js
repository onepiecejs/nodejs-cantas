// Welcome View

(function ($, _, Backbone) {

  "use strict";

  cantas.views.WelcomeView = Backbone.View.extend({

    el: '.content',

    events: {
    },

    template: jade.compile($("#template-welcome-view").text()),

    close: function() {
      // this.$el.empty();
      // this.undelegateEvents();
      // this.stopListening();

      return this;
    },

    render: function(context) {
      this.$el.html(this.template());
      cantas.setTitle(context.title);

      var $navArrows = $('#nav-arrows');
      var $nav = $('#nav-dots > span');

      var slitslider = $('#slider').slitslider({
          onBeforeChange: function(slide, pos) {
            $nav.removeClass('nav-dot-current');
            $nav.eq(pos).addClass('nav-dot-current');
          }
        });

      $navArrows.children(':last').on('click', function() {
        slitslider.next();
        return false;
      });

      $navArrows.children(':first').on('click', function() {
        slitslider.previous();
        return false;
      });

      $nav.each(function(i) {
        $(this).on('click',
          function(event) {
            var $dot = $(this);
            if (!slitslider.isActive()) {
              $nav.removeClass('nav-dot-current');
              $dot.addClass('nav-dot-current');
            }

            slitslider.jump(i + 1);
            return false;
          });
      });
    }

  });

}(jQuery, _, Backbone));
