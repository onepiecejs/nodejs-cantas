/*
 * Models for displaying Activity logs.
 */

(function ($, _, Backbone) {

  "use strict";

  cantas.models.Notification = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    socket: cantas.socket,
    urlRoot: "notification",

    url: function() {
      return "/notification/" + this.id;
    }

  });

  cantas.models.NotificationCollection = cantas.models.BaseCollection.extend({
    /*
     * With this url, collection responds all events whose name match
     * notification:[action]
     */
    url: "/notification",
    model: cantas.models.Notification,

    // sort notifications by 'created' in descending order
    comparator: function(a, b) {
      if (a.get('created') > b.get('created')) {
        return -1;
      }
      if (a.get('created') < b.get('created')) {
        return 1;
      }
      return 0;
    }
  });

}(jQuery, _, Backbone));
