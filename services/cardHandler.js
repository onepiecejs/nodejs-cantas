/**
 * Service for managing cards
 */
(function(exports) {

  var mongoose = require('mongoose'),
    Card = require('./../models/card'),
    async = require('async');


  /**
   * Get all cards created by the provided user
   * 
   * @param  {User}     user
   * @param  {Function} callback
   * @return {void}
   */
  exports.listMyCards = function(user, callback) {

    Card.find({
      isArchived: false,
      creatorId: user._id
    })
      .populate({
        path: 'boardId',
        select: '_id title isPublic isClosed'
      })
      .populate({
        path: 'listId',
        select: '_id title isArchived'
      })
      .sort('-created')
      .exec(function(err, cards) {
        callback(err, cards);
      });

  };


}(exports));