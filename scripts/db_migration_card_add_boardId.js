// add boardId to card schema

var async = require('async');
var util = require('util');
var mongoose = require('mongoose');
var settings = require('../settings');
var List = require('../models/list');
var Card = require('../models/card');

mongoose.connect(
  settings.mongodb.host,
  settings.mongodb.name,
  settings.mongodb.port,
  {
    user: settings.mongodb.user,
    pass: settings.mongodb.pass
  }
);

Card.find().populate('listId').exec(function(err, cards){
  var processed = 0;
  var updated = 0;
  cards.forEach(function(card){
    if (card.boardId && card.boardId.toString() === card.listId.boardId.toString()){
      processed++;
    }else{
      var boardId = card.listId.boardId;
      card.update({$set: {boardId: boardId}}, function(err){
        if(err){
          console.log("Error: card %s : %s", card.id, err);
        }else{
          updated++;
        }
        processed++;
      });
    }
  });

  async.until(
    function(){return cards.length === processed},
    function(callback){setTimeout(callback, 1000);},
    function(err){
      console.log(util.format("%d of %d cards proceessed.", processed, cards.length));
      console.log(util.format("%d of %d cards updated.", updated, cards.length));
      console.log("finished.");
      process.exit();
    }
  );
});
