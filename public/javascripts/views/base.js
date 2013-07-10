
$(function ($, _, Backbone) {

  "use strict";

  /*
   * View to render each section to show an Activity log
   */
  cantas.views.BaseView = Backbone.View.extend({
    close: function() {
      this.remove();
    }
  });


}(jQuery, _, Backbone));
