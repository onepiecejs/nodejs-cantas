(function (exports) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var stdlib = require("./stdlib");
  var User = require("../models/user");
  var Board = require("../models/board");
  var MemberRelation = require("../models/boardMemberRelation");
  var MemberStatus = require("../models/boardMemberStatus");
  var Sites = require("../services/sites");
  var signals = require("./signals");
  var notification = require("../services/notification");
  var LogActivity = require("../services/activity").Activity;

  var isEmailAddr = function(username) {
    //var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    // FIXME: only accept email of redhat.com
    var re = new RegExp('^\\w+([\\.-]?\\w+)*@redhat.com$');
    return re.test(username);
  };

  /*
   * Ensure invited user exists. CREATE an account for it if not exist.
   */
  var taskEnsureUserExists = function(board, options, asyncCallback) {
    var invitation = options.invitation;
    var username = invitation.invitee.split('@')[0];
    var conditions = {$or: [{username: username}, {email: invitation.invitee}]};

    User.findOne(conditions, function(err, user) {
      if (err) {
        asyncCallback(err, user);
      } else {
        if (user) {
          asyncCallback(null, board, user, options);
        } else {
          User.create({username: username, email: invitation.invitee}, function(err, user) {
            if (err) {
              asyncCallback(err, user);
            } else {
              asyncCallback(null, board, user, options);
            }
          });
        }
      }
    });
  };

  /*
   * Build member relation, or update the status if user was invited and
   * revoked the membership before.
   */
  var taskBuildMemberRelation = function(board, user, options, asyncCallback) {
    MemberRelation.findOne({boardId: board._id, userId: user._id}, function(err, member) {
      if (err) {
        asyncCallback(err, member, options);
      } else {
        if (!member) {
          MemberRelation.create({
            boardId: board._id,
            userId: user._id,
            status: MemberStatus.inviting
          }, function(err, memberRelation) {
            if (err) {
              asyncCallback(err, null);
            } else {
              asyncCallback(null, board, user, memberRelation, options);
            }
          });
        } else if (member.status === MemberStatus.kickedOff) {
          member.status = MemberStatus.inviting;
          member.save(function(err, memberRelation) {
            if (err) {
              asyncCallback(err, null);
            } else {
              asyncCallback(null, board, user, memberRelation, options);
            }
          });
        } else {
          /*
           * One case that causes execution here is that the user has been
           * invited and status is avialable now.
           *
           * FIXME: a better way to reflect this. Better stop building member
           * relation by checking the user's member status in advance.
           */
          asyncCallback(true, null, options);
        }
      }
    });
  };

  var taskNotifyInvitee = function(board, invitee, memberRelation, options, asyncCallback) {
    if (memberRelation) {
      var inviter = options.socket.handshake.user;
      var msg = util.format("%s invite you to join board [%s](%s)",
                            inviter.username, board.title, board.url);
      notification.notify(options.socket, invitee, msg, notification.types.invitation);
      notification.mail(options.socket, invitee, msg, notification.types.invitation, {
        body: {
          inviteeName: invitee.username,
          inviterName: inviter.username,
          boardTitle: board.title,
          boardUrl: Sites.currentSite() + board.url
        },
        template: "invitation.jade"
      });
      asyncCallback(null, board, invitee, memberRelation, options);
    }
  };

  var taskLogActivity = function(board, invitee, memberRelation, options, asyncCallback) {
    if (memberRelation) {
      var socket = options.socket;
      var inviter = socket.handshake.user;
      var content = util.format("%s invited %s to this board", inviter.username, invitee.username);
      var activity = new LogActivity({socket: socket, exceptMe: false});
      activity.log({content: content});
      asyncCallback(null, memberRelation, options);
    }
  };

  /*
   * Task function to do singla invitation.
   */
  var inviteSingle = function(options) {
    async.waterfall([
      // Inviting a board member, so we have to find the board first.
      function(callback) {
        Board.getById(options.invitation.boardId, "_id title", function(err, board) {
          if (err || board === null) {
            callback(true, null, options);
          } else {
            callback(null, board, options);
          }
        });
      },
      taskEnsureUserExists,
      taskBuildMemberRelation,
      taskNotifyInvitee,
      taskLogActivity,
    ], function(err, memberRelation, options) {
      options.finalCallback(err, memberRelation);
    });
  };

  /*
   * Do invitation indeed.
   *
   * callback is invoked by passing two arguments as normal.
   * First one is err object, and the second one is an object of
   * BoardMemberRelation.
   */
  var doInvitation = function(socket, invitations, callback) {
    invitations.forEach(function(invitation) {
      inviteSingle({
        invitation: invitation,
        socket: socket,
        finalCallback: callback
      });
    });
  };

  exports.init = function(socket) {

    /*
     * Validate whether user with username in argument exists.
     */
    socket.on("user-exists", function(data) {
      var username = data.username;
      User.exists(username, function(exists) {
        var data = { username: username, exists: exists, isEmailAddr: isEmailAddr(username) };
        socket.emit("user-exists-resp", { ok: stdlib.RESP_SUCCESS, data: data});
      });
    });

    /*
     * Invite a series of users to be a board's member.
     *
     * Arguments:
     * - data: an object containing following attributes.
     *   - boardId: holds the target board's Id.
     *   - boardUrl: a string, representing the URL of the board.
     *   - inviter: a string, the username of inviter.
     *   - invitees: an array, containing usernames of invitees.
     */
    socket.on("invite-board-member", function(data) {
      // refactor data structure
      var invitations = [];
      var numberOfInvitees = data.invitees.length;
      var i;
      for (i = 0; i < numberOfInvitees; i++) {
        invitations.push({
          boardId: data.boardId,
          boardUrl: data.boardUrl,
          inviter: data.inviter,
          invitee: data.invitees[i]
        });
      }

      doInvitation(socket, invitations, function(err, memberRelations) {
        // Do something to check the result
        if (err) {
          socket.emit("invite-board-member-resp",
                    { ok: stdlib.RESP_FAILURE, data: err });
        } else {
          socket.emit("invite-board-member-resp",
                    { ok: stdlib.RESP_SUCCESS, data: memberRelations });
        }
      });
    });

    socket.on("revoke-membership", function(data) {
      // Save reference to client socket
      var that = this;
      data.username = data.username.split('@')[0];

      async.waterfall([
        // First, to check only board creator can revoke board member's membership
        function(callback) {
          Board
            .findOne({_id: data.boardId})
            .select("creatorId")
            .populate("creatorId")
            .exec(function(err, board) {
              var creatorId = board.creatorId._id.toString();
              var currentUserId = that.handshake.user._id.toString();
              var isCreatorRevoking = creatorId === currentUserId;
              if (isCreatorRevoking) {
                callback(null, board.creatorId);
              } else {
                var msg = "User is not allowed to revoke member's membership";
                callback(msg, null);
              }
            });
        },
        // Second, ensure creator's membership is not being revoked currently.
        // Otherwise, terminate this operation immediately.
        function(creator, callback) {
          if (creator.username === data.username) {
            callback("Not allow to revoke creator's membership.", null);
          } else {
            callback(null);
          }
        },
        // Third, I have to get user's Id by its username whose membership
        // will be revoked.
        function(callback) {
          User.findOne({ username: data.username }, function(err, user) {
            if (err) {
              callback(err, null, null);
            } else {
              callback(null, user._id, data.boardId);
            }
          });
        },
        function(userId, boardId, callback) {
          MemberRelation.revoke(userId, boardId, function(err, relation) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, relation);
            }
          });
        }
      ], function(err, relation) {
        var retval = stdlib.RESP_SUCCESS;
        if (err) {
          socket.room.emit("revoke-membership-resp", {
            ok: stdlib.RESP_FAILURE,
            data: err
          });
        } else {

          //create activity log
          var creator = socket.handshake.user;
          var content = util.format("%s removed %s from this board",
            creator.username, data.username);
          var activity = new LogActivity({socket: socket, exceptMe: false});
          activity.log({content: content});

          // Do not loose the information coming with request.
          var respdata = data;
          respdata.updated = relation;
          socket.room.emit("revoke-membership-resp", {
            ok: stdlib.RESP_SUCCESS,
            data: respdata
          });

          // To update member relation collection in the front-end
          socket.room.emit('/boardmemberrelation:update', relation);

          signals.post_delete.send(relation, {
            instance: relation,
            socket: socket
          }, function(err, result) {});
        }
      });

    });

  };

}(exports));
