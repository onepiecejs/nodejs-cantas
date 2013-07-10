
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var BaseCRUD = require("./base");
  var User = require("../../models/user");
  var Sites = require("../../services/sites");
  var notification = require("../../services/notification");

  function CardCRUD(options) {
    BaseCRUD.call(this, options);

    this.modelClass = require("../../models/card");
    this.key = this.modelClass.modelName.toLowerCase();
  }

  util.inherits(CardCRUD, BaseCRUD);

  CardCRUD.prototype._read = function(data, callback) {
    if (data){
      if (data._id){
        this.modelClass.findOne(data).populate("assignees").exec(
          function (err, result) {
            callback(err, result);
          }
        );
      } else {
        this.modelClass.find(data).populate("assignees").exec(
          function (err, result) {
            async.map(
              result,
              function(card, callback){
                card.getBadges(function(err, badges){
                  var transformed = card.toJSON();
                  transformed.badges = badges;
                  callback(null, transformed);
                });
              },
              function(err, result){
                callback(err, result);
            });
          }
        );
      }
    } else {
      this.modelClass.find({}).populate("assignees").exec(callback);
    }
  };

  CardCRUD.prototype._patch = function(data, callback) {
    var self = this;
    var _id = data._id;
    var name = '/' + this.key + '/' + _id + ':update';
    delete data['_id']; // _id is not modifiable

    if (data.assignees) {
      async.waterfall([
        function(callback){
          // update card assignees
          self.modelClass.findById(_id, function (err, card) {
            if (err) {
              callback(err, card);
            } else {
              var newAssignees = [];
              data.assignees.forEach(function(assignee){
                if (card.assignees.indexOf(assignee) === -1){
                  newAssignees.push(assignee);
                }
              });
              card.assignees = data.assignees;
              card.save(function(err, updatedCard){
                if(err){
                  callback(err, updatedCard);
                }else{
                  callback(null, updatedCard, newAssignees);
                }
              });
            }
          });
        },
        function(updatedCard, newAssignees, callback){
          // send notification to new assignees
          if (newAssignees.length){
            var assigner = self.socket.getCurrentUser();
            User.find({_id: {$in: newAssignees}}, function(err, users){
              users.forEach(function(assignee){
                var msg = util.format("%s assign card [%s](%s) to you.", assigner.username, updatedCard.title, updatedCard.url);
                notification.notify(self.socket, assignee, msg, notification.types.information, {
                  body: {
                    assigner: assigner.username,
                    assignee: assignee.username,
                    cardTitle: updatedCard.title,
                    cardUrl: Sites.currentSite() + updatedCard.url
                  },
                  template: "assign.jade"
                });
              });
            });
          }
          callback(null, updatedCard);
        }
      ], function(err, updatedCard){
        if(err){
          callback(err, updatedCard);
        }else{
          updatedCard.populate("assignees", function(err, card){
            if(err){
              callback(err, card);
            }else{
              self.emitMessage(name, card);
            }
          });
        }
      });
    } else {
      this.modelClass.findByIdAndUpdate(_id, data, function (err, updatedData) {
        if (err) {
          callback(err, updatedData);
        } else {
          // TODO:
          self.logActivity(self.key, updatedData, 'update');
          updatedData.populate("assignees", function(err, updatedData){
            self.emitMessage(name, updatedData);
          });
        }
      });
    }
  }

  module.exports = CardCRUD;

})(module);
