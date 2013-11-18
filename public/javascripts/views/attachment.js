
(function ($, _, Backbone) {

  "use strict";

  cantas.views.AttachmentView = Backbone.View.extend({
    el: 'section.card-option.attachment',

    template: jade.compile($('#template-attachment-view').text()),

    events: {},

    initialize: function() {
      this.listenTo(this.model.attachmentCollection, 'add', this.renderAttachmentDownloadItem);
      this.model.attachmentCollection.fetch({
        data: {cardId: this.model.id}
      });

      this.isConfirmDeleteAttatchment = true;
    },

    render: function() {
      var card = this.model.toJSON();
      card.isBoardMember = window.cantas.isBoardMember;
      this.$el.html(this.template(card));
      this.renderAllAttachmentDownloadItems();

      return this;
    },

    renderAllAttachmentDownloadItems: function() {
      var _this = this;
      this.model.attachmentCollection.each(function(attachment) {
        _this.renderAttachmentDownloadItem(attachment);
      });
    },

    renderAttachmentDownloadItem: function(attachment) {
      var downloadItemView = new cantas.views.AttachmentDownloadItemView({
        'model': attachment,
        'parentView': this
      });
      var downloadTable = this.$('.js-attachment-download-table');
      if (downloadTable.find('tbody tr').length === 0) {
        var styleCode = '<thead>' + '<tr>' + '<th>Cover</th>' +
          '<th>Thumbnail</th>' + '<th>File Name</th>' +
          '<th>Size</th>' + '<th>Uploader Name</th>' +
          '<th>Upload Time</th>' + '<th></th>' + '</tr>' + '</thead>';
        downloadTable.prepend(styleCode);
      }
      this.$('.js-attachment-download-table tbody').prepend(downloadItemView.render().el);
    }

  });

  cantas.views.AttachmentUploadItemView = cantas.views.BaseView.extend({

    tagName: 'tr',

    className: 'template-upload fade js-template-upload',

    template: jade.compile($('#template-attachment-upload-view').text()),

    events: {
      'click .js-upload-start': 'startUpload',
      'click .js-upload-abort': 'abortUpload',
      'click .js-upload-delete': 'deleteUpload'
    },

    render: function() {
      var attachment = this.model.toJSON();
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
      $(event.target).removeClass('js-upload-abort').addClass('js-upload-start').text('Attach');
      $(event.target).closest('tr.js-template-upload').children('td.upload-size')
        .find('.js-upload-progress').prop('aria-valuenow', 0)
        .find('.bar').css('width', '0' + '%');
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
      "click .js-download-cover": "toggleCover"
    },

    initialize: function() {
      this.listenTo(this.model, 'remove', this.onModelRemove);
      this.listenTo(this.model, 'change:isCover', this.isCoverChanged);
    },

    render: function() {
      var attachment = this.model.toJSON();
      attachment.fileName = attachment.name.slice(attachment.name.indexOf('-') + 1);
      attachment.url = '/attachments/' + attachment.cardId + '/' + attachment.name;
      if (attachment.cardDetailThumbPath) {
        attachment.thumbnail = window.location.protocol +
          '//' + window.location.host +
          attachment.cardDetailThumbPath.slice(
            attachment.cardDetailThumbPath.indexOf('/attachments')
          );
      } else {
        attachment.thumbnail = '';
      }
      attachment.size = cantas.utils.formatFileSize(attachment.size);
      attachment.createdOn = cantas.utils.formatDate(attachment.createdOn);
      attachment.isBoardMember = window.cantas.isBoardMember;
      if (attachment.uploaderId._id.toString() === cantas.utils.getCurrentUser().id.toString()) {
        attachment.isUploader = true;
      } else {
        attachment.isUploader = false;
      }
      var creator = cantas.utils.getCurrentBoardView().model.attributes.creatorId;
      var boardCreatorId = (typeof creator === "object") ? creator._id : creator;
      attachment.isBoardAdmin = (cantas.user.id === boardCreatorId) ? true : false;
      this.$el.html(this.template(attachment));

      if (this.model.get("isCover")) {
        this.$el.addClass("checked");
      }

      if (!window.cantas.isBoardMember) {
        this.undelegateEvents();
      }

      return this;
    },

    onModelRemove: function() {
      this.close();

      var downloadTable = this.options.parentView.$('.js-attachment-download-table');
      if (downloadTable.find('tbody tr').length === 0) {
        downloadTable.find('thead').remove();
      }
    },

    onDeleteClick: function(event) {
      event.stopPropagation();

      if (!cantas.utils.getCurrentBoardView().confirmDialogView) {
        cantas.utils.getCurrentBoardView().confirmDialogView = new cantas.views.ConfirmDialogView();
      }

      var attachmentView = this.options.parentView;
      if (attachmentView.isConfirmDeleteAttatchment) {
        // $(event.target.parentNode).focus();
        this.confirmDeleteAttachment(event);
        $(".modal-scrollable").on("scroll",
          function() {
            $("body").click();
          });
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
    },

    isCoverChanged: function(data) {
      this.$el.toggleClass("checked");
    },

    toggleCover: function() {
      // only board members can do this.
      var isCover = !this.model.get("isCover");
      this.model.patch({'isCover': isCover, 'cardId': this.model.toJSON().cardId});
    }

  });

}(jQuery, _, Backbone));
