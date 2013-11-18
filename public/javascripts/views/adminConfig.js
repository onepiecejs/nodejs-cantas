// Admin Config View -- config vote and comment permission
// -------------------------------------------------------

(function ($, _, Backbone) {

  "use strict";

  /*
   * View for modificaiton of a board's information.
   */
  cantas.views.ConfigView = Backbone.View.extend({
    el: "div.config-window",
    template: jade.compile($("#template-admin-config-view").text()),

    events: {
      'hidden.bs.modal': 'closeConfigView'
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.voteConfig = new cantas.views.VoteConfig({
        model: this.model
      });
      this.voteConfig.render();

      this.commentConfig = new cantas.views.CommentConfig({
        model: this.model
      });
      this.commentConfig.render();

      return this;
    },

    modal: function() {
      this.$el.modal();
    },

    show: function() {
      this.render().modal();
    },

    closeConfigView: function() {
      this.voteConfig.close();
      this.commentConfig.close();

      // clear configView
      this.$el.empty();
      this.undelegateEvents();
      this.stopListening();
    }
  });

  cantas.views.VoteConfig = Backbone.View.extend({
    el: "dl.js-vote",
    template: jade.compile($("#template-vote-config-view").text()),

    events: {
      'click .js-disable-vote span:last': 'onDisableVoteClick',
      'click .js-enable-vote span:last': 'onEnableVoteClick',
      'click .js-open-vote span:last': 'onOpenVoteClick'
    },

    initialize: function() {
      this.model.on('change:voteStatus', this.render, this);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      var voteStatus = this.model.toJSON().voteStatus;
      var checkedVoteElement;

      if (voteStatus === 'opened') {
        checkedVoteElement = $('.js-open-vote')[0];
      } else if (voteStatus === 'enabled') {
        checkedVoteElement = $('.js-enable-vote')[0];
      } else {
        checkedVoteElement = $('.js-disable-vote')[0];
      }

      this.selectCheckedVoteStatus(checkedVoteElement);

      return this;
    },

    close: function() {
      this.remove();
    },

    selectCheckedVoteStatus: function(checkedVoteElement) {
      var voteOptions = this.$el.find('dl.js-vote a');
      var clickIndex = voteOptions.index($(checkedVoteElement));
      var checkedIndex = voteOptions.index(voteOptions.filter('.checked'));

      if (clickIndex > checkedIndex) {
        voteOptions.slice(0, clickIndex).removeClass('via')
          .children().removeClass('via');
      }

      voteOptions.removeClass('checked')
        .children().removeClass('checked');

      $(checkedVoteElement).addClass("via checked")
        .nextAll().addClass("via")
        .end().children("span:first").addClass("via")
        .end().children("span:eq(1)").addClass("checked");
    },

    onDisableVoteClick: function(event) {
      this.changeVoteStatus(event.target.parentNode, 'disabled');
    },

    onEnableVoteClick: function(event) {
      this.changeVoteStatus(event.target.parentNode, 'enabled');
    },

    onOpenVoteClick: function(event) {
      this.changeVoteStatus(event.target.parentNode, 'opened');
    },

    changeVoteStatus: function(sender, status) {
      if ($(sender).hasClass('checked')) {
        return;
      }

      var origin_voteStatus = this.model.get('voteStatus');
      this.model.set('voteStatus', status);
      this.model.patch({
        voteStatus: status,
        original: {voteStatus: origin_voteStatus}
      });

      this.selectCheckedVoteStatus(sender);
    }

  });

  cantas.views.CommentConfig = Backbone.View.extend({
    el: "dl.js-comment",
    template: jade.compile($("#template-comment-config-view").text()),

    events: {
      'click .js-disable-comment span:last': 'onDisableCommentClick',
      'click .js-enable-comment span:last': 'onEnableCommentClick',
      'click .js-open-comment span:last': 'onOpenCommentClick'
    },

    initialize: function() {
      this.model.on('change:commentStatus', this.render, this);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      var commentStatus = this.model.toJSON().commentStatus;
      var checkedCommentElement;

      if (commentStatus === 'opened') {
        checkedCommentElement = $('.js-open-comment')[0];
      } else if (commentStatus === 'enabled') {
        checkedCommentElement = $('.js-enable-comment')[0];
      } else {
        checkedCommentElement = $('.js-disable-comment')[0];
      }

      this.selectCheckedCommentStatus(checkedCommentElement);

      return this;
    },

    close: function() {
      this.remove();
    },

    selectCheckedCommentStatus: function(checkedCommentElement) {
      var commentOptions = this.$el.find('dl.js-comment a');
      var clickIndex = commentOptions.index($(checkedCommentElement));
      var checkedIndex = commentOptions.index(commentOptions.filter('.checked'));

      if (clickIndex > checkedIndex) {
        commentOptions.slice(0, clickIndex).removeClass('via')
          .children().removeClass('via');
      }

      commentOptions.removeClass('checked')
        .children().removeClass('checked');

      $(checkedCommentElement).addClass("via checked")
        .nextAll().addClass("via")
        .end().children("span:first").addClass("via")
        .end().children("span:eq(1)").addClass("checked");
    },

    onDisableCommentClick: function(event) {
      this.changeCommentStatus(event.target.parentNode, 'disabled');
    },

    onEnableCommentClick: function(event) {
      this.changeCommentStatus(event.target.parentNode, 'enabled');
    },

    onOpenCommentClick: function(event) {
      this.changeCommentStatus(event.target.parentNode, 'opened');
    },

    changeCommentStatus: function(sender, status) {
      if ($(sender).hasClass('checked')) {
        return;
      }

      var origin_commentStatus = this.model.get('commentStatus');
      this.model.set('commentStatus', status);
      this.model.patch({
        commentStatus: status,
        original: {commentStatus: origin_commentStatus}
      });

      this.selectCheckedCommentStatus(sender);
    }
  });

}(jQuery, _, Backbone));
