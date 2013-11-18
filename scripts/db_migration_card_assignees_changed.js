// change card.assignees from memberId to userId

var async = require('async');
var util = require('util');
var mongoose = require('mongoose');
var settings = require('../settings');
var Card = require('../models/card');
var BoardMemberRelation = require('../models/boardMemberRelation');

mongoose.connect(
  settings.mongodb.host,
  settings.mongodb.name,
  settings.mongodb.port,
  {
    user: settings.mongodb.user,
    pass: settings.mongodb.pass
  }
);

// find cards with assignees
Card.find({assignees: {$not: {$size: 0}}}).exec(function(err, cards) {
  var processed = 0;
  var updated = 0;
  cards.forEach(function(card) {
    BoardMemberRelation.find({_id: {$in: card.assignees}}, {userId: 1}).
      exec(function(err, members) {
        if (members.length) {
          var userIds = members.map(function(member) {
            return member.userId;
          });
          card.assignees = userIds;
          card.save(function(err, updatedCard) {
            processed++;
            if (err) {
              console.log("Error ", card.id, " : ", err);
            } else {
              updated++;
            }
          });
        } else {
          processed++;
        }
      });
  });

  async.until(
    function() {
      return cards.length === processed;
    },
    function(callback) {
      setTimeout(callback, 1000);
    },
    function(err) {
      console.log(util.format("%d of %d cards proceessed.", processed, cards.length));
      console.log(util.format("%d of %d cards updated.", updated, cards.length));
      console.log("finished.");
      process.exit();
    }
  );
});
