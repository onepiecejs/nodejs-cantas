
$(function ($, _, Backbone) {

  "use strict";

  cantas.views.AttachmentView = Backbone.View.extend({
    el: 'section.card-option.attachment',

    template: jade.compile($('#template-attachment-view').text()),

    events: {},

    initialize: function() {
      this.listenTo(this.model.attachmentCollection, 'add', this.renderAttachmentDownloadItem);

      this.isConfirmDeleteAttatchment = true;
    },

    render: function() {
      var card = this.model.toJSON();
      card.isBoardMember = window.cantas.isBoardMember;
      this.$el.html(this.template(card));
      this.renderAllAttachmentDownloadItems();

      return this;
    },

    renderAllAttachmentDownloadItems: function(){
      var _this = this;
      this.model.attachmentCollection.fetch({
        data: {cardId: this.model.id},
        success: function(collection, response, options){
          collection.each(function(attachment){
            _this.renderAttachmentDownloadItem(attachment);
          });
        }
      });
    },

    renderAttachmentDownloadItem: function(attachment) {
      var downloadItemView = new cantas.views.AttachmentDownloadItemView({
        'model': attachment,
        'parentView': this
      });
      var downloadTable = this.$('.js-attachment-download-table');
      if(downloadTable.find('tbody tr').length == 0) {
        downloadTable.prepend('<thead><tr><th></th><th>File Name</th><th>Size</th>'
          +'<th>Uploader Name</th><th>Upload Time</th><th></th></tr></thead>');
      }
      this.$('.js-attachment-download-table tbody').prepend(downloadItemView.render().el);
    }

  });

  cantas.views.AttachmentUploadItemView = cantas.views.BaseView.extend({

    tagName: 'tr',

    className: 'template-upload fade js-template-upload',

    template: jade.compile($('#template-attachment-upload-view').text()),

    events:{
      'click .js-upload-start': 'startUpload',
      'click .js-upload-abort': 'abortUpload',
      'click .js-upload-delete': 'deleteUpload'
    },

    render: function() {
      var attachment = this.model;
      attachment.fileSize = cantas.utils.formatFileSize(attachment.size);
      this.$el.html(this.template(attachment));

      return this;
    },

    startUpload: function(event) {
      event.stopPropagation();

      this.options.data.submit();
      $(event.target).removeClass('js-upload-start').addClass('js-upload-abort').text('Abort');
    },

    abortUpload: function(event) {
      event.stopPropagation();

      this.options.data.abort();
      $(event.target).removeClass('js-upload-abort').addClass('js-upload-start').text('Start');
    },

    deleteUpload: function(event) {
      event.stopPropagation();

      this.options.data.abort();

      var uploadTableEl = this.options.parentView.$el.find('.js-attachment-upload-table');
      if (uploadTableEl.find('tbody tr').length === 1) {
        uploadTableEl.find('thead').remove();
      }

      this.close();
    }

  });

  cantas.views.AttachmentDownloadItemView = cantas.views.BaseView.extend({
    tagName: 'tr',

    className: 'template-download fade js-template-download',

    template: jade.compile($('#template-attachment-download-view').text()),

    events: {
      'click .js-download-delete': 'onDeleteClick',
    },

    initialize: function() {
      this.listenTo(this.model, 'remove', this.onModelRemove);

    },

    render: function() {
      var attachment = this.model.toJSON();
      attachment.fileName = attachment.name.slice(attachment.name.indexOf('-') + 1);
      attachment.url= '/attachments/' + attachment.cardId + '/' + attachment.name;
      attachment.size = cantas.utils.formatFileSize(attachment.size);
      attachment.createdOn = cantas.utils.formatDate(attachment.createdOn);
      attachment.isBoardMember = window.cantas.isBoardMember;
      attachment.isUploader = (attachment.uploaderId._id.toString() === cantas.utils.getCurrentUser().id.toString()) ? true : false;
      this.$el.html(this.template(attachment));

      return this;
    },

    onModelRemove: function() {
      this.close();

      var downloadTable = this.options.parentView.$('.js-attachment-download-table');
      if (downloadTable.find('tbody tr').length === 0) {
        downloadTable.find('thead').remove();
      }
    },

    onDeleteClick: function(event){
      event.stopPropagation();

      if (!cantas.utils.getCurrentBoardView().confirmDialogView) {
        cantas.utils.getCurrentBoardView().confirmDialogView = new cantas.views.ConfirmDialogView();
      }

      var attachmentView = this.options.parentView;
      if (attachmentView.isConfirmDeleteAttatchment) {
        // $(event.target.parentNode).focus();
        this.confirmDeleteAttachment(event);
        $(".modal-scrollable").on("scroll", function(){ $("body").click(); });
      } else {
        this.$el.fadeOut().remove();
        this.model.destroy();
      }
    },

    confirmDeleteAttachment: function(event) {
      event.stopPropagation();

      $("body").click();

      var _this = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "delete",
        operationItem: "attachment",
        confirmInfo: "Are you sure to delete this attachment?",
        captionYes: "Delete",
        yesCallback: function() {
          _this.model.destroy();

          if ($("#js-cb-noask:checked").length > 0) {
            _this.options.parentView.isConfirmDeleteAttatchment = false;
          }

          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        pageX: event.pageX - 290,
        pageY: event.pageY
      });
    }

  });

}(jQuery, _, Backbone));
