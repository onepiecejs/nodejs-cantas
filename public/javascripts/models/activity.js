/*
 * Models for displaying Activity logs.
 */

(function ($, _, Backbone) {

  "use strict";

  cantas.models.Activity = cantas.models.BaseModel.extend({
    idAttribute: "_id",
    socket: cantas.socket,
    urlRoot: "activity",

    url: function () {
      return "/activity/" + this.id;
    }

  });

  cantas.models.ActivityCollection = cantas.models.BaseCollection.extend({
    /*
     * With this url, collection responds all events whose name match
     * activities:[action]
     */
    url: "/activity",
    model: cantas.models.Activity,

    comparator: function (activity) {
      return activity.get("createdOn");
    }
  });

}(jQuery, _, Backbone));
