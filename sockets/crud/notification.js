
(function(module) {

  "use strict";

  var util = require("util");
  var BaseCRUD = require("./base");

  function NotificationCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/notification");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(NotificationCRUD, BaseCRUD);

  NotificationCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id || data.id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data._id; // _id is not modifiable

    this.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
      if (err) {
        callback(err, updatedData);
      } else {
        self.emitMessage(name, updatedData);
      }
    });
  };

  module.exports = NotificationCRUD;

}(module));
