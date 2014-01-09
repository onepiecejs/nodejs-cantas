
(function ($, _, Backbone) {

  "use strict";

  cantas.views.ImportBugzillaView = Backbone.View.extend({
    el: 'div.window-overlay',

    template: jade.compile($('#template-import-bugzilla-view').text()),

    initialize: function() {

      this.boardId = this.model.id;
      this.isConfirmDeleteSyncConfig = true;
      this.listenTo(this.model.syncConfigCollection, 'add', this.renderSyncConfigItem);
      this.model.syncConfigCollection.fetch({
        data: {'boardId': this.model.id}
      });
    },

    events: {
      'click .js-add-mapping': 'showAddMappingView',
      'click .js-sync-all': 'onMappingSyncAll',
      'hidden.bs.modal': 'closeImportBugzillaWindow'
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.modal();
      this.renderAllSyncConfigItems();

      return this;
    },

    renderSyncConfigItem: function(configuration) {
      var syncConfigItemView = new cantas.views.SyncConfigItemView({
        'model': configuration,
        parentView: this
      });
      this.$('div.mapping-add').after(syncConfigItemView.render().el);
      var syncAllButton = this.$('.js-sync-all');
      if (syncAllButton.prop('disabled')) {
        syncAllButton.prop('disabled', false);
      }
    },

    renderAllSyncConfigItems: function() {
      var _this = this;
      if (this.model.syncConfigCollection.length === 0) {
        this.$('.js-sync-all').prop('disabled', true);
      } else {
        this.model.syncConfigCollection.each(function(configuration) {
          _this.renderSyncConfigItem(configuration);
        });
      }
    },

    showAddMappingView: function(event) {
      if (this.syncConfigItemAddView === undefined) {
        this.syncConfigItemAddView = new cantas.views.SyncConfigItemAddView({
          model: this.model,
          parentView: this
        });
      } else {
        this.syncConfigItemAddView.initialize();
      }
      this.$el.find('div.mapping-edit button.js-syncconfig-cancel').click();
      this.syncConfigItemAddView.render();
      this.$el.find('div.mapping-add').show().append(this.syncConfigItemAddView.$el);
      this.syncConfigItemAddView.$el.show();
      this.syncConfigItemAddView.$el.find('input.js-query-url').select();
    },

    onMappingSyncAll: function(event) {
      var _this = this;
      $(event.target).prop('disabled', true);
      $(".js-mapping-sync").trigger('click');
    },

    closeImportBugzillaWindow: function() {
      if (this.syncConfigItemAddView) {
        this.syncConfigItemAddView.remove();
      }
      this.undelegateEvents();
      this.stopListening();
      this.$el.empty();
    }

  });

  cantas.views.SyncConfigItemView = cantas.views.BaseView.extend({
    className: 'mapping-list',

    template: jade.compile($('#template-syncconfig-item-view').text()),

    events: {
      'click .js-is-active': 'switchActiveStatus',
      'click .js-mapping-sync': 'onMappingSync',
      'click .js-mapping-stopsync': 'onMappingStopSync',
      'click .js-queryurl-wrapper,.js-listname-wrapper': 'openEditMode',
      'click .js-syncconfig-delete': 'onDeleteSyncConfigClick'
    },

    initialize: function() {
      _.bindAll(this, 'render', 'socketInit');
      this.socketInit();

      this.parentView = this.options.parentView;
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'remove', this.onModelRemove);
    },

    render: function() {
      var configuration = this.model.toJSON();
      configuration.listName = configuration.listId.title;
      configuration.isBoardMember = window.cantas.isBoardMember;
      this.$el.html(this.template(configuration));

      if (!this.model.get('isActive')) {
        this.$el.addClass('mapping-disabled');
      } else {
        this.$el.removeClass('mapping-disabled');
      }

      if (!window.cantas.isBoardMember) {
        this.undelegateEvents();
      }

      return this;
    },

    onModelRemove: function() {
      if (this.parentView.$('.mapping-list').not('.mapping-add').length === 1) {
        this.parentView.$('.js-sync-all').prop('disabled', true);
      }
      this.close();
    },

    confirmDeleteSyncConfig: function(event) {
      event.stopPropagation();

      $("body").click();

      var self = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "delete",
        operationItem: "mapping",
        confirmInfo: "Are you sure to delete this mapping?",
        captionYes: "Delete",
        yesCallback: function() {
          self.removeSyncConfig();

          if ($("#js-cb-noask:checked").length > 0) {
            self.parentView.isConfirmDeleteSyncConfig = false;
          }

          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        pageX: event.pageX - 285,
        pageY: event.pageY
      });
    },

    removeSyncConfig: function() {
      this.$el.fadeOut();
      this.model.destroy();
    },

    onDeleteSyncConfigClick: function(event) {
      if (this.model === null) {
        return;
      }

      if (!cantas.utils.getCurrentBoardView().confirmDialogView) {
        cantas.utils.getCurrentBoardView().confirmDialogView = new cantas.views.ConfirmDialogView();
      }
      var checklistView = this.parentView;
      if (checklistView.isConfirmDeleteSyncConfig) {
        $(event.target.parentNode).focus();
        this.confirmDeleteSyncConfig(event);
        $("div.window-module").on("scroll",
          function() {
            $('body').click();
          });
      } else {
        this.removeSyncConfig();
      }
    },

    socketInit: function() {
      var sock = cantas.socket;
      var _this = this;
      var syncId = _this.model.id;

      sock.on("sync-bugs:resp:" + syncId, function(data) {
        var result_msg = data.msg;
        if (data.status) {
          _this.$(".js-sync-status").removeClass("alert-success").addClass("alert-danger");
          if (result_msg.indexOf('Stoped') > -1) {
            _this.$('.js-mapping-stopsync').text('Sync')
              .removeClass('js-mapping-stopsync btn-danger')
              .addClass('js-mapping-sync btn-primary');
          }
        } else {
          _this.$(".js-sync-status").removeClass("alert-danger").addClass("alert-success");
          _this.$('.js-mapping-stopsync').text('Sync')
            .removeClass('js-mapping-stopsync btn-danger').addClass('js-mapping-sync btn-primary');
        }
        _this.$(".js-sync-status").html(result_msg);
        _this.delegateEvents();
        _this.$('.js-mapping-sync').prop('disabled', false);

        if (_this.parentView.$('.js-mapping-stopsync').length === 0) {
          _this.parentView.$('.js-sync-all').prop("disabled", false);
        }
      });
    },

    switchActiveStatus: function(event) {
      this.model.patch({'isActive': !this.model.get('isActive')});
    },

    onMappingSync: function(event) {
      var queryData = {
        syncId: this.model.id
      };
      this.socketInit();
      cantas.socket.emit("sync-bugs:req", queryData);

      $(event.target).text('Stop')
        .removeClass('js-mapping-sync btn-primary').addClass('js-mapping-stopsync btn-danger')
        .prop('disabled', false);

      this.$(".js-sync-status").removeClass("alert-danger").addClass("alert-success")
        .html("loading....");

      this.undelegateEvents();
      this.delegateEvents({'click .js-mapping-stopsync': 'onMappingStopSync'});
    },

    onMappingStopSync: function(event) {
      cantas.socket.emit('sync-bugs:stopSync', {'syncId': this.model.id});
      $(event.target).prop('disabled', true);
    },

    openEditMode: function(event) {
      this.parentView.$('div.mapping-add button.js-syncconfig-cancel').click();
      this.parentView.$('div.mapping-edit button.js-syncconfig-cancel').click();
      this.$el.find('div.row-fluid, a.mapping-delete').addClass('hide');
      var editView = new cantas.views.SyncConfigItemEditView({parentView: this});
      this.$el.find('div.row-fluid').after(editView.render().$el);
      editView.$el.find('input.js-query-url').trigger('change');
      if ($(event.target).is('.js-queryurl-wrapper')) {
        editView.$el.find(".js-query-input").select();
      }
    }

  });

  cantas.views.SyncConfigItemAddView = cantas.views.BaseView.extend({
    className: 'js-add-mappping',

    template: jade.compile($('#template-syncconfig-item-input-view').text()),

    events: {
      'click .js-specify-list': 'switchSpecifyListMode',
      'click .js-syncconfig-add': 'addSyncConfig',
      'click .js-syncconfig-cancel': 'hideAddModeView'
    },

    initialize: function() {
      this.parentView = this.options.parentView;
      this.model.listCollection.on('add', this.render, this);
      this.model.listCollection.on('remove', this.render, this);
      _.bindAll(this, 'render', 'socketInit');
      this.socketInit();

      this.isNewList = false;
    },

    render: function() {
      var syncConfig = {};
      syncConfig.lists = [];
      this.model.listCollection.each(function(list, index) {
        if (!list.toJSON().isArchived) {
          syncConfig.lists.push({'id': list.toJSON()._id, 'name': list.toJSON().title});
        }
      });
      this.$el.html(this.template(syncConfig));

      return this;
    },

    socketInit: function() {
      var sock = cantas.socket;
      var _this = this;

      sock.removeAllListeners("sync-bugs:checked-queryurl");

      sock.on("sync-bugs:checked-queryurl", function(data) {
        var result_msg = data.msg;
        if (data.status) {
          _this.$el.find("div.js-alert").removeClass("alert-success").addClass("alert-danger");
          _this.$el.find("div.js-alert").html(result_msg);
        } else {
          _this.$el.find("div.js-alert").removeClass("alert-danger").addClass("alert-success");
          result_msg = "Query" + data.msg + " Bugs";
          _this.$el.find("div.js-alert").html(result_msg);
          if (_this.$el.find('input.js-query-url').hasClass('js-create-mapping')) {
            _this.saveSyncConfig();
            _this.$el.find('input.js-query-url').removeClass('js-create-mapping');
          } else if (_this.$el.find('input.js-query-url').hasClass('js-update-mapping')) {
            _this.saveEditedSyncConfig();
            _this.$el.find('input.js-query-url').removeClass('js-update-mapping');
          }
        }

      });
    },

    checkQueryurl: function() {
      var queryUrl = this.$('input.js-query-url').val();
      if (queryUrl) {
        var queryData = {
          boardId: this.boardId,
          queryUrl: queryUrl
        };

        cantas.socket.emit("sync-bugs:queryurl", queryData);
        this.$el.find("div.js-alert").removeClass("hide");
        this.$el.find("div.js-alert")
          .removeClass("alert-danger")
          .addClass("alert-success")
          .html("loading...");
        this.$el.find("div.js-alert").addClass("js-query-url-active");
      } else {
        var result_msg = "Url can not be null";
        this.$el.find("div.js-alert").removeClass("hide");
        this.$el.find("div.js-alert")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .html(result_msg);
      }
    },

    switchSpecifyListMode: function(event) {
      var existingList = this.$('select.js-list-name');
      var newList = this.$('input.js-list-name');
      if (this.isNewList) {
        $(event.target).text('New List');
        newList.hide();
        existingList.show();
        this.isNewList = false;
      } else {
        $(event.target).text('Choose a existing List');
        existingList.hide();
        newList.show().select();
        this.isNewList = true;
      }
    },

    isValidListName: function() {
      var _this = this;
      var isValidListName = false;
      if (_this.isNewList) {
        var newListName = _this.$('input.js-list-name').val();
        if (newListName) {
          isValidListName = true;
        }
      } else {
        var existingListId = _this.$('select.js-list-name').find('option:selected').val();
        if (existingListId) {
          isValidListName = true;
        }
      }
      return isValidListName;
    },

    saveSyncConfig: function() {
      var queryUrl = this.$('.js-query-url').val();
      var syncConfigData = {
        'boardId': this.model.id,
        'queryUrl': queryUrl,
        'queryType': 'bugzilla',
        'creatorId': cantas.user.id
      };
      if (this.isNewList) {
        var newListName = this.$('input.js-list-name').val();
        syncConfigData.listId = '0';
        syncConfigData.listName = $.trim(newListName);
        syncConfigData.listOrder = this.model.listCollection.last().toJSON().order;
      } else {
        var existingListId = this.$('select.js-list-name').find('option:selected').val();
        syncConfigData.listId = existingListId;
      }
      var newSyncConfig = new cantas.models.SyncConfig(syncConfigData);
      newSyncConfig.save();

      this.hideAddModeView();
    },

    addSyncConfig: function(event) {
      if (this.isValidListName()) {
        this.checkQueryurl();
        this.$el.find('input.js-query-url').addClass('js-create-mapping');
      } else {
        return false;
      }
    },

    hideAddModeView: function() {
      this.$el.hide();
      this.parentView.$el.find('div.mapping-add').hide();
    }

  });


  cantas.views.SyncConfigItemEditView = cantas.views.SyncConfigItemAddView.extend({
    className: 'row-fluid mapping-edit',

    template: jade.compile($('#template-syncconfig-item-edit-view').text()),

    events: {
      'click .js-specify-list': 'switchSpecifyListMode',
      'click .js-syncconfig-save': 'editSyncConfig',
      'click .js-syncconfig-cancel': 'closeEditMode'
    },

    initialize: function() {
      this.parentView = this.options.parentView;
      this.listCollection = cantas.utils.getCurrentBoardModel().listCollection;

      this.listCollection.on('add', this.render, this);
      this.listCollection.on('remove', this.render, this);
      _.bindAll(this, 'render', 'socketInit');
      this.socketInit();

      this.isNewList = false;
    },

    render: function() {
      var configuration = this.parentView.model.toJSON();
      configuration.lists = [];
      this.listCollection.each(function(list) {
        if (!list.get('isArchived')) {
          configuration.lists.push({'id': list.get('_id'), 'name': list.get('title')});
        }
      });
      this.$el.html(this.template(configuration));

      return this;
    },

    editSyncConfig: function(event) {
      event.stopPropagation();
      if (this.isValidListName()) {
        this.checkQueryurl();
        this.$el.find('input.js-query-url').addClass('js-update-mapping');
      } else {
        return false;
      }
    },

    saveEditedSyncConfig: function() {
      var queryUrl = $.trim(this.$('input.js-query-url').val());
      var listId = this.isNewList ? '0' : this.$('select.js-list-name option:selected').val();
      var newAttributes = {
        'queryUrl': queryUrl,
        'listId': listId
      };

      var changedAttributes = this.parentView.model.changedAttributes(newAttributes);
      if (changedAttributes) {
        if (newAttributes.listId === '0') {
          changedAttributes.listName = $.trim(this.$('input.js-list-name').val());
          changedAttributes.listOrder = this.listCollection.last().toJSON().order;
          changedAttributes.boardId = this.parentView.model.get('boardId');
          changedAttributes.creatorId = cantas.utils.getCurrentUser().id;
        }
        this.parentView.model.patch(changedAttributes, {silent: true});
      }

      this.closeEditMode();
    },

    closeEditMode: function() {
      this.parentView.$('.row-fluid:not(.mapping-edit), a.mapping-delete').removeClass('hide');
      this.remove();
    }

  });

}(jQuery, _, Backbone));
