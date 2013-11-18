(function(exports) {

  "use strict";

  var SyncConfig = require("../models/syncConfig");
  var SyncBugzilla = require("../services/bugzilla").SyncBugzilla;
  var searchBug = require("../services/bugzilla").SearchBug;
  var util = require("util");
  var syncStatusArray = require("../services/bugzilla").syncStatusArray;

  var syncBugs = function(data) {
    var socket = this;
    var syncId = data.syncId;
    var user = socket.getCurrentUser();
    var length = syncStatusArray.length;
    var isExisting = false;
    var i;
    for (i = 0; i < length; i++) {
      if (syncStatusArray[i] === syncId.toString()) {
        syncStatusArray.splice(i, 1);
      }
    }

    SyncConfig.findById(syncId, function(err, data) {
      if (!err) {
        if (data.isActive && data.queryType.toLowerCase() === 'bugzilla') {
          var bugzilla = new SyncBugzilla({
            boardId: data.boardId,
            listId: data.listId,
            queryUrl: data.queryUrl,
            syncConfigId: data._id,
            socket: socket
          });

          bugzilla.getBugList(function(err, options) {
            var result = {};
            var eventName = 'sync-bugs:resp:' + data._id;

            if (err) {
              result.status = 1;
              result.msg = util.format('Get buglist failed');
              socket.room.emit(eventName, result);
            } else if (options.bugs) {
              bugzilla.startSync(options, function(err, cardBugRelationArray) {
                if (err) {
                  if (err === 'SyncStoped') {
                    result.status = 0;
                    result.msg = util.format('Sync Stoped! Having Synced %s bugs',
                      cardBugRelationArray.length - 1);
                  } else {
                    result.status = 1;
                    result.msg = util.format('Sync Error! %s', err);
                  }
                } else {
                  result.status = 0;
                  result.msg = util.format('Sync Done! Synced %s bugs',
                    cardBugRelationArray.length);
                }
                socket.room.emit(eventName, result);
              });
            }
          });
        }
      }
    });
  };

  var stopSync = function(data) {
    var syncId = data.syncId;
    var length = syncStatusArray.length;
    var isExisting = false;
    var i;
    for (i = 0; i < length; i++) {
      if (syncStatusArray[i] === syncId) {
        isExisting = true;
      }
    }
    if (!isExisting) {
      syncStatusArray.push(syncId);
    }

  };

  var checkQueryUrl = function(data) {
    var socket = this;
    var queryUrl = data.queryUrl;
    if (queryUrl) {
      var result = {};
      var eventName = 'sync-bugs:checked-queryurl';
      var options = {'queryUrl': queryUrl};
      searchBug(options, function(err, bugs) {
        if (err) {
          result.status = 1;
          result.msg = util.format('%s', err);
        } else if (bugs.length === 0) {
          result.status = 1;
          result.msg = util.format('queried bug number is 0');
        } else {
          result.status = 0;
          result.msg = util.format(bugs.length);
        }
        socket.room.emit(eventName, result);
      });
    }
  };

  exports.init = function(socket) {

    socket.on('sync-bugs:req', syncBugs);
    socket.on('sync-bugs:stopSync', stopSync);
    socket.on('sync-bugs:queryurl', checkQueryUrl);
  };

}(exports));
