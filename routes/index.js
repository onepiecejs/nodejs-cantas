(function (exports) {

  "use strict";

  exports.init = function (app, passport, sessionStore) {

    var boardHandler = require('../services/boardHandler');
    var moment = require('moment');
    var utils = require('../services/utils');
    var Activity = require('../models/activity');
    var User = require("../models/user")

    var checkForSessionTimeout = function (req, res, next){
      var sessionID = req.cookies['express.sid'];
      sessionStore.load(sessionID, function(err, session){
        if ((err || !session) && req.xhr) {
          res.status(500).json({error: 'canats session timeout'});
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
        app.helpers({user: req.user});

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
    app.get('/api/new', checkForSessionTimeout, ensureAuthenticated, function(req,res) {
      var boardId = boardHandler.createBoard(req.user.username, function(err, boardId) {
        var activitData = {
          'content': "This board is created by " + req.user.username,
          'creatorId': req.user.id,
          'boardId': boardId
        };

        var t = new Activity(activitData);
        t.save( function (err) {
          if (err) {
            console.log(err);
          }
        });

        res.json({"boardId": boardId});
      })
    });

    // API - get mine boards
    app.get('/api/mine',checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listMyBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get invited boards
    app.get('/api/invited',checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.listInvitedBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get public boards
    app.get('/api/public',checkForSessionTimeout, ensureAuthenticated,function (req, res) {
      boardHandler.listPublicBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get closed boards
    app.get('/api/closed',checkForSessionTimeout, ensureAuthenticated,function (req, res) {
      boardHandler.listClosedBoards(req.user.username, function(err, boards) {
        res.json(boards);
      });
    });

    // API - get archived cards of board
    app.get('/api/archived/cards/:boardId', checkForSessionTimeout, ensureAuthenticated, function(req, res){
      boardHandler.archivedCards(req.params.boardId, function(err, items){
        res.json(items);
      });
    });

    // API - get archived lists of board
    app.get('/api/archived/lists/:boardId', checkForSessionTimeout, ensureAuthenticated,function(req, res){
      boardHandler.archivedLists(req.params.boardId, function(err, items){
        res.json(items);
      });
    });

    // API - get archived cards of list
    app.get('/api/archived/getorders/:listId', checkForSessionTimeout, ensureAuthenticated, function(req, res){
      boardHandler.getOrderCollectionFromList(req.params.listId, function(err, items){
        res.json(items);
      });
    });

    // login
    app.get('/login',
      function (req, res) {
      res.render('login', {'title':'New to Cantas?',
        message: req.flash('error') });
    });

    app.post('/login',
      passport.authenticate('local', { failureRedirect:'/login', failureFlash:true }), function (req, res) {
        var redirectUrl = req.session.redirectUrl || "/";
        res.redirect(redirectUrl);
      });

    // logout
    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });

    // route to board
    app.get('/board/:boardId/:slug?', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.boardExists(req.params.boardId, function(err, board){
        if (board){
          res.render('application', {title: 'Cantas'});
        }else{
          res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
        }
      });
    });

    // route to card
    app.get('/card/:cardId/:slug?', checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      boardHandler.cardExists(req.params.cardId, function(err, card){
        if (card){
          res.render('application', {title: 'Cantas'});
        }else{
          res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
        }
      });
    });


    // TODO:when timeout, user should be relogin,and server will redirect to
    // original url, this is not ajax, should be add this mapping.we can
    // implement a SPA design, it will reduce  this annoying url mapping.
    app.get('/boards/new', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // route to public board
    app.get('/boards/public', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // route to mine board
    app.get('/boards/mine', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // route to closed board
    app.get('/boards/closed', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // route to query user email
    app.get('/api/search_member', ensureAuthenticated, function (req, res) {
      var regex = new RegExp(req.query["term"], 'i');
      var query = User.find({email: regex}, {'email': 1}).sort({"updated_at": -1}).sort({"created_at": -1}).limit(20);
      
      query.exec(function(err, users) {
        if (!err) {
          res.json(users);
        }
      });
    }); 

    // help page
    app.get('/help', ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // route to home page
    app.get('/',
      passport.authenticate('remote_user',{ failureRedirect:'/login' }),
      checkForSessionTimeout, ensureAuthenticated, function (req, res) {
      res.render('application', {title: 'Cantas'});
    });

    // 404 - ALWAYS keep this route as the last one
    app.get('*', ensureAuthenticated, function (req, res) {
      res.status(404).render('404', {title: 'Cantas | 404', url: req.url});
    });

  };

}(exports));
