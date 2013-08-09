
$(function ($, _, Backbone) {

  "use strict";

  cantas.views.CommentView = Backbone.View.extend({
    el: "section.card-option.comment",

    template: jade.compile($("#template-comment-view").text()),

    events: {
      "click .js-save-comment": "saveComment",
      "focus .js-add-comment-input": "showControls",
      "click .js-cancel-comment": "hideControls"
    },

    initialize: function() {
      this.model.commentCollection.on('add', this.renderComment, this);
    },

    render: function() {
      this.$el.html(this.template());
      this.renderCommentItems();
      this.controlComment();
      return this;
    },

    controlComment: function() {
      var commentStatus = cantas.utils.getCurrentCommentStatus();
      if (commentStatus == 'disabled') {
        this.$el.find('.js-add-comment-input').hide();
      } else {
        if (commentStatus == 'enabled' && !window.cantas.isBoardMember) {
            this.$el.find('.js-add-comment-input').hide();
          }
        };
    },

    renderCommentItems: function(){
      var that = this;
      this.model.commentCollection.fetch({data: {cardId: this.model.id}, success: function(collection, response, options){
        collection.forEach(function(comment){
          that.renderComment(comment);
        });
      }});
    },

    renderComment: function(comment){
      var itemView = new cantas.views.CommentItemView({model: comment});
      this.$el.find(".comment-list").prepend(itemView.render().el);
    },

    saveComment: function(event){
      event.stopPropagation();
      var content = this.$el.find('.js-add-comment-input').val().trim();
      if (content === ''){
        return false;
      }
      var newComment = new cantas.models.Comment({
        content: content,
        cardId: this.model.id,
        authorId: cantas.utils.getCurrentUser().id
      });
      newComment.save();
      this.hideControls();
    },

    showControls: function(){
      this.$el.find(".js-comment-controls").show();
    },

    hideControls: function(){
      this.$el.find(".js-comment-controls").hide();
      this.$el.find(".js-add-comment-input").val('')
    }

  });

  cantas.views.CommentItemView = Backbone.View.extend({
    tagName: "dl",
    className: "clearfix",

    template: jade.compile($("#template-comment-item-view").text()),

    events: {
      "click .js-edit-comment": "editComment"
    },

    initialize: function() {
      this.model.on('change', this.render, this);
    },

    render: function() {
      var comment = this.model.toJSON();
      comment.content = markdown.toHTML(comment.content);
      this.$el.html(this.template(comment));
      this.controlComment();
      return this;
    },

    controlComment: function() {
      var commentStatus = cantas.utils.getCurrentCommentStatus();
      if (commentStatus == 'disabled') {
        this.$el.find('a.js-edit-comment').hide();
      } else {
        if (commentStatus == 'enabled' && !window.cantas.isBoardMember) {
          this.$el.find('a.js-edit-comment').hide();
        };
      }
    },

    editComment: function(event){
      event.stopPropagation();
      var commentId = $(event.target).data('cid');
      this.$el.find("dd").hide();
      var editView = new cantas.views.CommentItemEditView({model: this.model});
      this.$el.find("dd").after(editView.render().el);
      editView.$el.find(".js-comment-input").select();
    }

  });

  cantas.views.CommentItemEditView = Backbone.View.extend({
    tagName: "div",
    className: "edit-comment",

    template: jade.compile($("#template-comment-item-edit-view").text()),

    events: {
      "click .js-save-comment": "saveEditedComment",
      "click .js-cancel-comment": "closeEditor"
    },

    render: function(){
      this.$el.html(this.template());
      var content = this.model.get("content");
      this.$el.find(".js-comment-input").val(content).select();
      return this;
    },

    saveEditedComment: function(event){
      event.stopPropagation();
      var content = this.$el.find('.js-comment-input').val().trim();
      // comment content can't be blank
      if (content === ''){
        return false;
      }
      this.closeEditor(event);
      // patch if content changed
      if (content !== this.model.get("content")){
        this.model.patch({content: content});
      }
    },

    closeEditor: function(event){
      event.stopPropagation();
      this.$el.siblings("dd").show();
      this.$el.remove();
    },

  });

}(jQuery, _, Backbone));
