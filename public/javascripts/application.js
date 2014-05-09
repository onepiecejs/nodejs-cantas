// Provide top-level namespaces for our javascript.
$(function ($, _, Backbone) {

  "use strict";

  window.cantas = window.cantas || {};
  cantas.models = {};
  cantas.socket = io.connect("" + 
    document.location.protocol + 
    "//" + document.location.hostname +
    ":" + window.cantas.settings.socketIO.port, {
    "reconnect": true,
    "max reconnection attempts": 100,
    "max reconnection delay": 32000,
    "reconnection delay": cantas.utils.randomWait(100,1000)
    });
  cantas.views = {};

  cantas.setTitle = function(title) {
    window.document.title = "Cantas | " + title;
  };

  moment.lang('en', {
    calendar : {
      lastDay: '[Yesterday at] LT',
      sameDay: '[Today at] LT',
      nextDay: '[Tomorrow at] LT',
      lastWeek: '[last] dddd [at] LT',
      nextWeek: 'dddd [at] LT',
      sameElse: 'DD/MM/YYYY'
    }
  });

}(jQuery, _, Backbone));
