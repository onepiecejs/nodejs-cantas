// add boardId to card schema

var async = require('async');
var util = require('util');
var mongoose = require('mongoose');
var settings = require('../settings');
var ChecklistItem = require('../models/checklistItem');
var Checklist = require('../models/checklist');

mongoose.connect(
  settings.mongodb.host,
  settings.mongodb.name,
  settings.mongodb.port,
  {
    user: settings.mongodb.user,
    pass: settings.mongodb.pass
  }
);

ChecklistItem.find().populate('checklistId').exec(function(err, items) {
  var total = items.length;
  var processed = 0;
  var updated = 0;
  items.forEach(function(item) {
    if (item.cardId && item.cardId.toString() === item.checklistId.cardId.toString()) {
      processed++;
    } else {
      item.update({$set: {cardId: item.checklistId.cardId}}, function(err) {
        if (err) {
          console.log("Error: checklist item %s : %s", item.id, err);
        } else {
          updated++;
        }
        processed++;
      });
    }
  });

  async.until(
    function() {
      return total === processed;
    },
    function(callback) {
      setTimeout(callback, 1000);
    },
    function(err) {
      console.log(util.format("%d of %d checklist items proceessed.", processed, total));
      console.log(util.format("%d of %d checklist items updated.", updated, total));
      console.log("finished.");
      process.exit();
    }
  );
});
