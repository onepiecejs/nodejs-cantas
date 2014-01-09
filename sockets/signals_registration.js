
(function(module) {

  "use strict";

  var async = require("async");
  var util = require("util");
  var signals = require("./signals");
  var Board = require("../models/board");
  var Card = require("../models/card");
  var CardLabelRelation = require("../models/cardLabelRelation");
  var MemberRelation = require("../models/boardMemberRelation");
  var Comment = require("../models/comment");
  var ChecklistItem = require("../models/checklistItem");
  var Checklist = require("../models/checklist");
  var Attachment = require("../models/attachment");
  var Vote = require("../models/vote");
  var handlers = require('./signalHandlers');

  var cantasUtils = require('../services/utils');
  var notification = require('../services/notification');
  var Sites = require("../services/sites");

  signals.post_delete.connect(MemberRelation, function(sender, args, done) {
    var socket = args.socket;
    async.waterfall([
      // Find cards assigned to the member
      function(callback) {
        Card.find(
          {boardId: args.instance.boardId, assignees: args.instance.userId},
          {_id: 1},
          function(err, cards) {
            if (err) {
              callback(err, null);
            } else {
              var cardIds = [];
              if (cards.length) {
                cardIds = cards.map(function(card) { return card.id; });
              }
              callback(null, cardIds);
            }
          }
        );
      },
      // Remove the user from cards assigned to him
      function(cardIds, callback) {
        if (cardIds.length) {
          cardIds.forEach(function(cardId) {
            Card.findByIdAndUpdate(cardId,
              {$pull: {assignees: args.instance.userId}},
              function(err, updatedCard) {
                if (!err) {
                  updatedCard.populate('assignees', function(err, card) {
                    if (!err) {
                      var name = '/card/' + card.id + ':update';
                      socket.room.emit(name, card);
                    }
                  });
                }
              });
          });
        }
        callback(null, true);
      }
    ], done);
  });

  signals.post_patch.connect(Card, function(sender, args, done) {

    // send notifications to card subscribers
    var card = args.instance;
    if (card.subscribeUserIds) {
      var user = args.socket.getCurrentUser();
      var safeTitle = cantasUtils.safeMarkdownString(card.title);
      var notifyMsg = null;
      if (args.changeFields.indexOf('title') >= 0) {
        notifyMsg = util.format("%s changed card from '%s' to [%s](%s)",
          user.username, args.originData.title,
          safeTitle, card.url);
      }
      if (args.changeFields.indexOf('description') >= 0) {
        notifyMsg = util.format("%s changed description from '%s'" +
          " " + "to '%s' in card [%s](%s)",
          user.username, args.originData.description,
          args.instance.description, safeTitle, card.url);
      }
      if (args.changeFields.indexOf('subscribeUserIds') >= 0) {
        var updatedIndex = card.subscribeUserIds.indexOf(user.id);
        var originIndex = args.originData.subscribeUserIds.indexOf(user.id);
        if (updatedIndex === -1 && originIndex >= 0) {
          notifyMsg = util.format("%s unsubscribed card [%s](%s).",
            user.username, safeTitle, card.url);
        } else if (updatedIndex >= 0 && originIndex === -1) {
          notifyMsg = util.format("%s subscribed card [%s](%s).",
            user.username, safeTitle, card.url);
        }
      }
      card.getSubscribeUsers(function(err, subscribeUsers) {
        if (subscribeUsers) {
          subscribeUsers.forEach(function(subscriber) {
            notification.notify(args.socket, subscriber, notifyMsg,
                                notification.types.information);
          });
        }
      });
    }
  });

  signals.post_create.connect(Comment, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});

            // send notification and email to subscribers
            if (card.subscribeUserIds) {
              var user = args.socket.getCurrentUser();
              var safeTitle = cantasUtils.safeMarkdownString(card.title);
              var notifyMsg = util.format("%s added a comment in card [%s](%s).",
                user.username, safeTitle, card.url);
              card.getSubscribeUsers(function(err, subscribers) {
                if (subscribers) {
                  subscribers.forEach(function(subscriber) {
                    notification.notify(args.socket, subscriber, notifyMsg,
                                        notification.types.information);
                    notification.mail(args.socket, subscriber, notifyMsg,
                                      notification.types.information, {
                        body: {
                          sender: user.username,
                          receiver: subscriber.username,
                          cardTitle: card.title,
                          cardUrl: Sites.currentSite() + card.url,
                          comment: args.instance.content
                        },
                        template: "comment.jade"
                      });
                  });
                }
              });
            }
          }
        });
      }
    });
  });

  signals.post_patch.connect(Comment, function(sender, args, done) {

    //send notification to subscribers
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card && card.subscribeUserIds) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        if (args.changeFields.indexOf('content') >= 0) {
          var originContent = args.originData.content;
          var currentContent = args.instance.content;
          var notifyMsg = util.format("%s edited a comment in card [%s](%s).",
                          user.username, safeTitle, card.url);

          card.getSubscribeUsers(function(err, subscribers) {
            if (subscribers) {
              subscribers.forEach(function(subscriber) {
                notification.notify(args.socket, subscriber, notifyMsg,
                                    notification.types.information);
                notification.mail(args.socket, subscriber, notifyMsg,
                                  notification.types.information, {
                    body: {
                      sender: user.username,
                      receiver: subscriber.username,
                      cardTitle: card.title,
                      cardUrl: Sites.currentSite() + card.url,
                      originComment: originContent,
                      currentComment: currentContent
                    },
                    template: "editComment.jade"
                  });
              });
            }
          });
        }
      }
    });
  });

  signals.post_create.connect(Checklist, function(sender, args, done) {

    // send notification to card subscribers
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card && card.subscribeUserIds) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = util.format("%s added a checklist '%s' in card [%s](%s).",
          user.username, args.instance.title, safeTitle, card.url);
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

  signals.post_create.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});

            // send notification and email to subscribers
            if (card.subscribeUserIds) {
              var checklistId = args.instance.checklistId;
              Checklist.findById(checklistId, 'title', function(err, checklist) {
                if (checklist) {
                  var user = args.socket.getCurrentUser();
                  var safeTitle = cantasUtils.safeMarkdownString(card.title);
                  var notifyMsg = util.format("%s added a checklistItem to" +
                                  " " + "checklist '%s' in card [%s](%s).",
                      user.username, checklist.title, safeTitle, card.url);

                  card.getSubscribeUsers(function(err, subscribers) {
                    if (subscribers) {

                      subscribers.forEach(function(subscriber) {
                        notification.notify(args.socket, subscriber, notifyMsg,
                                            notification.types.information);
                      });
                    }
                  });
                }
              });
            }
          }
        });
      }
    });
  });

  signals.post_patch.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });

        // send notifications to card subscribers
        if (card.subscribeUserIds) {
          var checklistItem = args.instance;
          Checklist.findById(args.instance.checklistId, 'title', function(err, checklist) {
            if (checklist) {
              var user = args.socket.getCurrentUser();
              var safeTitle = cantasUtils.safeMarkdownString(card.title);
              var notifyMsg = null;
              if (args.changeFields.indexOf('checked') >= 0) {
                if (args.instance.checked && !args.originData.checked) {
                  notifyMsg = util.format("%s checked checklistItem '%s'" +
                    " " + "from checklist '%s' in card [%s](%s)",
                    user.username, args.instance.content, checklist.title,
                    safeTitle, card.url);
                } else if (!args.instance.checked && args.originData.checked) {
                  notifyMsg = util.format("%s unChecked checklistItem '%s'" +
                    " " + "from checklist '%s' in card [%s](%s)",
                    user.username, args.instance.content, checklist.title,
                    safeTitle, card.url);
                }
              }
              if (args.changeFields.indexOf('content') >= 0) {
                notifyMsg = util.format("%s changed checklistItem '%s' to '%s'" +
                  " " + "from checklist '%s' in card [%s](%s)",
                  user.username, args.originData.content,
                  args.instance.content, checklist.title,
                  safeTitle, card.url);
              }
              card.getSubscribeUsers(function(err, subscribers) {
                if (subscribers) {
                  subscribers.forEach(function(subscriber) {
                    notification.notify(args.socket, subscriber, notifyMsg,
                                        notification.types.information);
                  });
                }
              });
            }
          });
        }
      }
    });
  });

  signals.post_patch.connect(CardLabelRelation, function(sender, args, done) {
    var cardId = args.instance.cardId;

    // send notification to subscribers
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card && card.subscribeUserIds) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = util.format("%s updated labels in card [%s](%s).",
            user.username, safeTitle, card.url);
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

  signals.post_delete.connect(ChecklistItem, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});
          }
        });

        // send notifications to card subscribers
        if (card.subscribeUserIds) {
          Checklist.findById(args.instance.checklistId, 'title', function(err, checklist) {
            if (checklist) {
              var user = args.socket.getCurrentUser();
              var safeTitle = cantasUtils.safeMarkdownString(card.title);
              var notifyMsg = util.format("%s deleted checklistItem '%s'" +
                  " " + "from checklist '%s' in card [%s](%s).",
                  user.username, args.instance.content,
                  checklist.title, safeTitle, card.url);
              card.getSubscribeUsers(function(err, subscribers) {
                if (subscribers) {
                  subscribers.forEach(function(subscriber) {
                    notification.notify(args.socket, subscriber, notifyMsg,
                                        notification.types.information);
                  });
                }
              });
            }
          });
        }
      }
    });
  });

  signals.post_delete.connect(Checklist, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card) {
        // send notification and email to subscribers
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = util.format("%s deleted checklist '%s' from card [%s](%s).",
            user.username, args.instance.title, safeTitle, card.url);
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

  signals.post_create.connect(Attachment, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});

            // send notification and email to subscribers
            var user = args.socket.getCurrentUser();
            var handledFileName = args.instance.name;
            var fileName = handledFileName.slice(handledFileName.indexOf('-') + 1);
            var safeTitle = cantasUtils.safeMarkdownString(card.title);
            var notifyMsg = util.format("%s uploaded attachment '%s' to card [%s](%s).",
                user.username, fileName, safeTitle, card.url);
            card.getSubscribeUsers(function(err, subscribers) {
              if (subscribers) {
                subscribers.forEach(function(subscriber) {
                  notification.notify(args.socket, subscriber, notifyMsg,
                                      notification.types.information);
                });
              }
            });
          }
        });
      }
    });
  });

  signals.post_delete.connect(Attachment, function(sender, args, done) {
    var cardId = args.instance.cardId;
    var isCover = args.instance.isCover;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getBadges(function(err, badges) {
          if (!err) {
            args.socket.room.emit("badges:update", {cardId: cardId, badges: badges});

            // send notification to subscribers
            var user = args.socket.getCurrentUser();
            var safeTitle = cantasUtils.safeMarkdownString(card.title);
            var handledFileName = args.instance.name;
            var fileName = handledFileName.slice(handledFileName.indexOf('-') + 1);
            var notifyMsg = util.format("%s deleted attachment '%s' from card [%s](%s).",
                user.username, fileName, safeTitle, card.url);
            card.getSubscribeUsers(function(err, subscribers) {
              if (subscribers) {
                subscribers.forEach(function(subscriber) {
                  notification.notify(args.socket, subscriber, notifyMsg,
                                      notification.types.information);
                });
              }
            });
          }
        });
        // if user deleted the attachment, whose thumbnail is used as the cover of this card
        if (isCover) {
          card.getCover(function(err, cover) {
            if (!err) {
              args.socket.room.emit("cover:update", {'cardId': cardId, 'cover': cover});
            }
          });
        }
      }
    });


  });

  signals.post_patch.connect(Attachment, function(sender, args, done) {
    var cardId = args.instance.cardId;
    Card.findById(cardId, function(err, card) {
      if (!err) {
        card.getCover(function(err, cover) {
          if (!err) {
            args.socket.room.emit("cover:update", {'cardId': cardId, 'cover': cover});
          }
        });

        // send notifications to card subscribers
        if (card.subscribeUserIds) {
          var user = args.socket.getCurrentUser();
          var safeTitle = cantasUtils.safeMarkdownString(card.title);
          var handledFileName = args.instance.name;
          var fileName = handledFileName.slice(handledFileName.indexOf('-') + 1);
          var notifyMsg = null;
          if (args.changeFields.indexOf('isCover') >= 0) {
            if (args.instance.isCover && !args.originData.isCover) {
              notifyMsg = util.format("%s set attachment '%s' as cover of card [%s](%s)",
                user.username, fileName, safeTitle, card.url);
            } else if (!args.instance.isCover && args.originData.isCover) {
              notifyMsg = util.format("%s cancelled cover '%s' from card [%s](%s).",
                user.username, fileName, safeTitle, card.url);
            }
          }
          card.getSubscribeUsers(function(err, subscribers) {
            if (subscribers) {
              subscribers.forEach(function(subscriber) {
                notification.notify(args.socket, subscriber, notifyMsg,
                                    notification.types.information);
              });
            }
          });
        }
      }
    });
  });

  /*
   * Attach fixed labels to newly created card
   */
  signals.post_create.connect(Board, function(sender, args, done) {
    handlers.attachLabelsToBoard(args.instance, done);
  });

  /*
   * Attach fixed labels to newly created board
   */
  signals.post_create.connect(Card, function(sender, args, done) {
    handlers.attachLabelsToCard(args.instance, done);
  });

  signals.post_create.connect(Vote, function(sender, args, done) {
    handlers.updateCardBadges(args, done);

    //send notification to subscribers
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card && card.subscribeUserIds) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = null;
        if (args.instance.yesOrNo) {
          notifyMsg = util.format("%s voted agree to card [%s](%s).",
            user.username, safeTitle, card.url);
        } else {
          notifyMsg = util.format("%s voted disagree to card [%s](%s).",
            user.username, safeTitle, card.url);
        }
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

  signals.post_patch.connect(Vote, function(sender, args, done) {
    handlers.updateCardBadges(args, done);

    //send notification to subscribers
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = null;
        if (args.instance.yesOrNo) {
          notifyMsg = util.format("%s changed vote to agree to card [%s](%s).",
            user.username, safeTitle, card.url);
        } else {
          notifyMsg = util.format("%s changed vote to disagree to card [%s](%s).",
            user.username, safeTitle, card.url);
        }
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

  signals.post_delete.connect(Vote, function(sender, args, done) {
    handlers.updateCardBadges(args, done);

    //send notification to card subscribers
    var cardId = args.instance.cardId;
    Card.findById(cardId, 'title subscribeUserIds', function(err, card) {
      if (card) {
        var user = args.socket.getCurrentUser();
        var safeTitle = cantasUtils.safeMarkdownString(card.title);
        var notifyMsg = null;
        if (args.instance.yesOrNo) {
          notifyMsg = util.format("%s cancelled vote agree to card [%s](%s).",
            user.username, safeTitle, card.url);
        } else {
          notifyMsg = util.format("%s changed vote disagree to card [%s](%s).",
            user.username, safeTitle, card.url);
        }
        card.getSubscribeUsers(function(err, subscribers) {
          if (subscribers) {
            subscribers.forEach(function(subscriber) {
              notification.notify(args.socket, subscriber, notifyMsg,
                                  notification.types.information);
            });
          }
        });
      }
    });
  });

}(module));
