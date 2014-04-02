(function ($, _, Backbone) {

  "use strict";


  /**
   * Sidebar View
   *
   *  - Sidebarview will be displayed on the right of the screen 
   *    (used for card / board filtering, settings, etc)
   *  - Will contain an array of panels - These will be responsible for 
   *    rendering themselves / their own behavior
   * 
   */
  cantas.views.SidebarView = cantas.views.BaseView.extend({

    className: "side-bar",

    panels: [],

    events: {
      'click .panel-container': function(e) {
        e.stopPropagation();
      }
    },

    template: jade.compile($("#template-sidebar-view").text()),

    initialize: function() {
      this.panels = [];

      return this;
    },

    /**
     * Render the sidebar and panels
     */
    render: function(context) {
      this.$el.empty();
      this.$el.append(this.template());
      this.renderSidebar();
      return this;
    },

    /**
     * Render the sidebar links (add all panels)
     */
    renderSidebar: function() {
      if (!this.panels || !this.panels.length) {
        return;
      }

      var $linkList = this.$('.sidebar-items').empty(),
        that = this;

      _.each(this.panels, function(panel) {
        panel.renderLink()
          .appendTo($linkList.append('<li></li>').find('li'))
          .on('click', function(e) {
            that.togglePanel(e, panel);
          });
      });
    },

    /**
     * Add a panel to the sidebar
     *
     * @param {object}   panel  The panel view to add
     * @return {object}
     */
    addPanel: function(panel) {
      this.panels.push(panel);
      this.renderSidebar();
    },

    /**
     * Remove a panel to the sidebar
     *
     * @param {object}   panel  The panel view to remove
     * @return {object}
     */
    removePanel: function(panel) {},


    /**
     * Toggle the open state of a sidebar panel
     */
    togglePanel: function(e, panel) {
      e.preventDefault();
      e.stopPropagation();
      if (panel.isOpen) {
        return this.closePanel(panel);
      }
      this.openPanel(panel);
    },

    /**
     * Open a panel
     */
    openPanel: function(panel) {
      // Close any currently open panels
      this.closePanels();

      var $container = this.$('.panel-container')
        .append(panel.render().$el)
        .show();

      // Close panels when clicking outside them
      $(document).on('click.sidebar.close', this.closePanels.bind(this));

      panel.isOpen = true;
    },

    /**
     * Close a panel
     */
    closePanel: function(panel) {
      var $container = this.$('.panel-container')
        .hide()
        .empty();

      $(document).off('click.sidebar.close');

      panel.isOpen = false;
      panel.close();
    },

    /**
     * Close all panels
     */
    closePanels: function() {
      _.each(this.panels, function(panel) {
        if (panel.isOpen) {
          this.closePanel(panel);
        }
      }.bind(this));
    },

    remove: function() {
      this.undelegateEvents();
      this.$el.remove();
      this.stopListening();
    }

  });


  /**
   * Panel for filtering card collections
   */
  cantas.views.CardFilterPanelView = cantas.views.BaseView.extend({

    context: null,
    isOpen: false,

    className: "sidebar-panel panel-filter",

    template: jade.compile($("#template-card-filter-panel-view").text()),
    linkTemplate: jade.compile($("#template-card-filter-panel-link-view").text()),

    events: {
      'submit .js-filter-form': 'submitAction'
    },

    initialize: function() {
      this.context = this.options.context;
      this.filters = this.options.filters || new cantas.models.CardFilter();
      return this;
    },

    /**
     * Render the sidebar and panels
     */
    render: function(context) {
      this.delegateEvents();
      this.$el.html(this.template(this.filters.toJSON()));
      return this;
    },

    /**
     * Get the sidebar link markup (gets called by the sidebar)
     * 
     * @return {object}
     */
    renderLink: function() {
      return $(this.linkTemplate({
        total: this.filters.totalActive()
      }));
    },


    /**
     * When the user submits the filter form
     */
    submitAction: function(e) {
      e.preventDefault();
      this.filterCollection();
      this.context.renderSidebar();
      // this.context.closePanels();
    },


    /**
     * Read the currently set filters and apply to collection
     * 
     * @return {void}
     */
    filterCollection: function() {
      $("body div.process-loading").show();
      var filters = this.getFilters();
      this.collection.fetch({
        data: filters.morph(),
        success: function() {
          $("body div.process-loading").hide();
        },
        error: function() {
          $("body div.process-loading").hide();
        }
      });
    },


    /**
     * Get filters from the form (updates the filters object)
     * 
     * @return {object}
     */
    getFilters: function() {
      return this.filters.set({
        keyword: this.$('.js-cardfilter-keyword').val(),
        created: this.$('.js-cardfilter-created').is(':checked'),
        subscribed: this.$('.js-cardfilter-subscribed').is(':checked'),
        assigned: this.$('.js-cardfilter-assigned').is(':checked'),
        dueDate: this.$('.js-cardfilter-dueDate:checked').val(),
        archived: this.$('.js-cardfilter-archived').is(':checked'),
        closed: this.$('.js-cardfilter-closed').is(':checked')
      });
    },

    remove: function() {
      this.undelegateEvents();
      this.$el.remove();
      this.stopListening();
    }

  });


}(jQuery, _, Backbone));

