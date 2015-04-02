(function (exports) {

  "use strict";

  exports.init = function (app, passport, sessionStore) {

    var boardHandler = require('../services/boardHandler');
    var cardHandler = require('../services/cardHandler');
    var importTrello = require('../services/importTrello');
    var moment = require('moment');
    var utils = require('../services/utils');
    var Activity = require('../models/activity');
    var Attachment = require('../models/attachment');
    var User = require("../models/user");
    var settings = require('../settings');
    var fs = require('fs');
    var easyimg = require('easyimage');

    /**
     * Return any setting that will be required clientside
     *
     * @return {string}
     */
    var getClientSettings = function() {
      return JSON.stringify({
        socketIO: {
          port: settings.socketIO.port || settings.app.port
        }
      });
    };

    var checkForSessionTimeout = function (req, res, next) {
      var sessionID = req.cookies['express.sid'];
      sessionStore.load(sessionID, function(err, session) {
        if ((err || !session) && req.xhr) {
          res.status(500).json({error: 'Cantas session timeout'});
        } else if ((err || !session) && !req.xhr) {
          req.session.redirectUrl = req.url;
          res.redirect('/login');
        } else {
          return next();
        }
      });
    };
    // Simple route middleware to ensure user is authenticated.
    // Use this route middleware on any resource that needs to be protected.  If
    // the request is authenticated (typically via a persistent login session),
    // the request will proceed.  Otherwise, the user will be redirected to the
    // login page.
    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) {
        if (req.user.isFirstLogin === true) {
          User.findByIdAndUpdate(req.user._id, {'isFirstLogin': false}, function(err, updatedData) {
            if (err) {
              console.log(err);
            }
          });
        }

        app.helpers({user: req.user});
        app.helpers({isFirstLogin: req.isFirstLogin});

        // If we have session.redirectUrl, use that,
        // otherwise, bypass redirect url
        if (req.session && req.session.redirectUrl) {
          var redirectUrl = req.session.redirectUrl;
          req.session.redirectUrl = null;
          return res.redirect(redirectUrl);
        }
        next();
      } else {
        if (req.xhr) {
          res.status(500).json({error: 'Cantas session timeout'});
        } else {
          req.session.redirectUrl = req.url;
          res.redirect('/login');
        }
      }
    }

    // API - create board
    app.get('/api/new', checkForSessionTimeout, ensureAuthenticated, function(req, res) {
      var boardId = boardHandler.createBoard(req.user.username, function(err, boardId) {
        var activitData = {
          'content': "This board is created by " + req.user.username,
          'creatorId': req.user.id,
          'boardId': boardId
        };

        var t = new Activity(activitData);
        t.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
        res.json({"boardId": boardId});
      });
    });

    // API - get mine boards
    app.get('/api/mine', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listMyBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get invited boards
    app.get('/api/invited', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listInvitedBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get public boards
    app.get('/api/public', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listPublicBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get closed boards
    app.get('/api/closed', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listClosedBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get my cards
    app.get('/api/cards/mine', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      cardHandler.listMyCards(req.user, function(err, cards) {
        if (err) {
          res.json(400, {
            success: false
          });
        }
        res.json(cards);
      });
    });

    // API - get archived cards of board
    app.get('/api/archived/cards/:boardId', checkForSessionTimeout,
      ensureAuthenticated, function(req, res) {
        boardHandler.archivedCards(req.params.boardId, function(err, items) {
          res.json(items);
        });
      });

    // API - get archived lists of board
    app.get('/api/archived/lists/:boardId', checkForSessionTimeout,
      ensureAuthenticated, function(req, res) {
        boardHandler.archivedLists(req.params.boardId, function(err, items) {
          res.json(items);
        });
      });

    // API - get archived cards of list
    app.get('/api/archived/getorders/:listId', checkForSessionTimeout,
      ensureAuthenticated, function(req, res) {
        boardHandler.getOrderCollectionFromList(req.params.listId, function(err, items) {
          res.json(items);
        });
      });

    // login
    app.get('/login',
      function (req, res) {
        res.render('login', {'title': 'New to Cantas?',
          message: req.flash('error') });
      });

    app.post('/login',
      passport.authenticate(settings.auth.default,
        {failureRedirect: '/login', failureFlash: true}),
      function (req, res) {
        var redirectUrl = req.session.redirectUrl || "/welcome";
        res.redirect(redirectUrl);
      });

    // log in with google account
    app.get('/auth/google', passport.authenticate('google_oauth', {
      failureRedirect: '/login',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    }));

    app.get('/oauth2callback', passport.authenticate('google_oauth', {failureRedirect: '/login'}),
      function (req, res) {
        var redirectUrl = req.session.redirectUrl || "/welcome";
        res.redirect(redirectUrl);
      });

    // logout
    app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
    });

    // route to board
    app.get('/board/:boardId/:slug?', checkForSessionTimeout,
      ensureAuthenticated, function (req, res) {
        boardHandler.boardExists(req.params.boardId, function(err, board) {
          if (board) {
            res.render('application', {title: 'Cantas', settings: getClientSettings()});
          } else {
            res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
          }
        });
      });

    // route to card
    app.get('/card/:cardId/:slug?', checkForSessionTimeout,
      ensureAuthenticated, function (req, res) {
        boardHandler.cardExists(req.params.cardId, function(err, card) {
          if (card) {
            res.render('application', {title: 'Cantas', settings: getClientSettings()});
          } else {
            res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
          }
        });
      });

    function fSRename(renameParams) {
      var filenameExt = utils.getExtension(renameParams.targetFilename);
      // remove filename string's extension type
      var unSanitizedString = renameParams.targetFilename.replace(/(.*)\.[^.]+$/, "$1");
      var sanitizedFilename = utils.formatForUrl(unSanitizedString) + filenameExt;
      var fullPath = renameParams.targetPath + '/' + sanitizedFilename;
      fs.rename(renameParams.tmpPath, fullPath,
        function(err) {
          if (err) {
            renameParams.res.json({'user_error': 'Uploading attachment failed',
              'maintainer_error': 'Renaming path failed'});
          } else {
            var imageRegExp = /(\.|\/)(bmp|gif|jpe?g|png)$/i;
            if (imageRegExp.test(filenameExt)) {
              var thumbPath_card = fullPath + '-thumb-card' + filenameExt;
              var thumbPath_cardDetail = fullPath + '-thumb-cardDetail' + filenameExt;
              easyimg.info(fullPath).then(
                function(file) {
                  var originalWidth = file.width;
                  var originalHeight = file.height;
                  var ratio = 5 / 3;
                  var resizeWidth = 0;
                  var resizeHeight = 0;

                  if (originalWidth > 250 || originalHeight > 150) {
                    if (originalWidth / originalHeight >= ratio) {
                      resizeHeight = 150;
                    } else {
                      resizeWidth = 250;
                    }
                    easyimg.rescrop({
                      src: fullPath,
                      dst: thumbPath_card,
                      width: resizeWidth || originalWidth,
                      height: resizeHeight || originalHeight,
                      cropwidth: 250,
                      cropheight: 150
                    }).then(
                      function(image) {
                        easyimg.resize({
                          src: thumbPath_card,
                          dst: thumbPath_cardDetail,
                          width: 70,
                          height: 42
                        }).then(
                          function(image) {
                            renameParams.res.json({'attachment': {
                              'cardId': renameParams.cardId,
                              'uploaderId': renameParams.uploaderId,
                              'name': sanitizedFilename,
                              'fileType': 'picture',
                              'size': renameParams.size,
                              'path': fullPath,
                              'cardThumbPath': thumbPath_card,
                              'cardDetailThumbPath': thumbPath_cardDetail
                            }});
                          },
                          function(err) {
                            renameParams.res.json({
                              'user_error': 'Uploading attachment failed',
                              'maintainer_error': 'Generating thumbnail ' +
                                'for the card details view failed' + err
                            });
                          }
                        );
                      },
                      function (err) {
                        renameParams.res.json({
                          'user_error': 'Uploading attachment failed',
                          'maintainer_error': 'Generating thumbnail failed:' +
                            err
                        });
                      }
                    );
                  } else {
                    easyimg.resize({
                      src: fullPath,
                      dst: thumbPath_cardDetail,
                      width: 70,
                      height: 42
                    }).then(
                      function(image) {
                        renameParams.res.json({'attachment': {
                          'cardId': renameParams.cardId,
                          'uploaderId': renameParams.uploaderId,
                          'name': sanitizedFilename,
                          'fileType': 'picture',
                          'size': renameParams.size,
                          'path': fullPath,
                          'cardDetailThumbPath': thumbPath_cardDetail
                        }});
                      },
                      function(err) {
                        renameParams.res.json({
                          'user_error': 'Uploading attachment failed',
                          'maintainer_error': 'Generating thumbnail err:' +
                            err
                        });
                      }
                    );
                  }
                },
                function (err) {
                  renameParams.res.json({
                    'user_error': 'Uploading attachment failed',
                    'maintainer_error': 'Reading image info failed:' + err
                  });
                }
              );
            } else {
              renameParams.res.json({'attachment': {
                'cardId': renameParams.cardId,
                'uploaderId': renameParams.uploaderId,
                'name': sanitizedFilename,
                'size': renameParams.size,
                'path': fullPath
              }});
            }
          }
        });
    }

    // rote to upload attachments for card
    app.post('/upload/:cardId', function(req, res) {
      var tmpPath = req.files.attachment.path;
      var targetPath = __dirname + '/../public/attachments/' + req.params.cardId;
      var targetFilename = req._startTime.valueOf() + '-' + req.files.attachment.name;

      var renameParams = {
        'tmpPath': tmpPath,
        'targetPath': targetPath,
        'targetFilename': targetFilename,
        'cardId': req.params.cardId,
        'uploaderId': req.user.id,
        'size': req.files.attachment.size,
        'res': res
      };
      fs.exists(targetPath, function (isExist) {
        if (!isExist) {
          fs.mkdir(targetPath, function(err) {
            if (err) {
              res.json({'user_error': 'Uploading attachment failed',
                'maintainer_error': 'Making directory failed'});
            } else {
              fSRename(renameParams);
            }
          });
        } else {
          fSRename(renameParams);
        }
      });
    });

    // route to download attachment
    app.get('/attachment/:attachmentId/download', function (req, res) {
      Attachment.findById(req.params.attachmentId, 'path name', function(err, attachment) {
        var realName = attachment.name;
        var friendlyName = realName.slice(realName.indexOf('-') + 1);
        res.download(attachment.path, friendlyName);
      });
    });

    // rote to import json file exported from Trello
    app.post('/import/:boardId', function(req, res) {
      var tmpPath = req.files.trelloJSON.path;

      fs.readFile(tmpPath, 'utf8', function (err, data) {
        if (err) {
          res.json({'user_error': 'Importing the json file from Trello failed.',
            'maintainer_error': 'Reading the json file failed'});
        } else {
          fs.unlink(tmpPath, function(err) {
            if (err) {
              res.json({'user_error': 'Importing the json file from Trello failed.',
                'maintainer_error': 'Deleting the temparary version of json file failed'});
            } else {
              /* add up how many times the callback function is called(including two cases:
               * with error and without error). the callback function will be fired every time
               * the append content ation(including: create or update) is finished.
              */
              var errCount = 0;
              var successCount = 0;
              var importDatasource = {};
              var targetSuccessCount = 0;
              try {
                importDatasource = JSON.parse(data);
                targetSuccessCount = importTrello.addupSuccessCount(importDatasource);
              } catch (error) {
                res.json({'user_error': 'Importing the json file from Trello failed,' +
                                         ' please check file content.',
                  'maintainer_error': error.message});
                return;
              }

              importTrello.appendContentToBoard(req.user._id, req.params.boardId,
                  importDatasource, function(err) {
                  if (err) {
                    errCount++;
                    // once getting the first error, return failure response to the front view
                    if (errCount === 1) {
                      res.json({'user_error': 'Importing the json file from Trello failed.',
                        'maintainer_error': err});
                    }
                  } else {
                    successCount++;
                    // only all the append content actions are completed sucessfully,
                    // return success response
                    if (successCount === targetSuccessCount) {
                      res.json({'success': 'Importing the json file from Trello completed.'});
                    }
                  }
                });
            }
          });
        }
      });
    });

    // TODO:when timeout, user should be relogin,and server will redirect to
    // original url, this is not ajax, should be add this mapping.we can
    // implement a SPA design, it will reduce  this annoying url mapping.
    app.get('/boards/new', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to public board
    app.get('/boards/public', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to mine board
    app.get('/boards/mine', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to closed board
    app.get('/boards/closed', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to my cards
    app.get('/cards/mine', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to my subscribed cards
    app.get('/cards/subscribed', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to my subscribed cards
    app.get('/cards/assigned', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to search results
    app.get('/search/:query', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // route to query user email
    app.get('/api/search_member', ensureAuthenticated, function (req, res) {
      var regex = new RegExp(req.query.term + '([a-z0-9]*[-_]?[a-z0-9]+)*@', 'i');
      var query = User.find({email: regex}, {'email': 1}).
                  sort({"updated_at": -1}).
                  sort({"created_at": -1}).
                  limit(2000);

      query.exec(function(err, users) {
        if (!err) {
          res.json(users);
        }
      });
    });

    // help page
    app.get('/help', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // account settings page
    app.get('/account', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas', settings: getClientSettings()});
    });

    // standalone help page
    app.get('/standalonehelp', function (req, res) {
      res.render('standalone-help', {title: 'Cantas'});
    });

    // welcome page
    app.get('/welcome', ensureAuthenticated, function (req, res) {
      if (req.user.isFirstLogin === true) {
        res.render('application', {title: 'Cantas', settings: getClientSettings()});
      } else {
        res.redirect('/');
      }
    });

    // route to home page
    app.get('/', ensureAuthenticated,
      function (req, res) {
        res.render('application', {title: 'Cantas', settings: getClientSettings()});
      });

    // 404 - ALWAYS keep this route as the last one
    app.get('*', ensureAuthenticated, function (req, res) {
      res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
    });

  };

}(exports));
