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
      },
      'click .sidebar-items li': 'togglePanel'
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
        panel.renderLink().appendTo($linkList);
      });
    },

    /**
     * Get a panel int he sidebar by ID
     *
     * @param {string} id The panel's id
     * @return {panelView} 
     */
    getPanel: function(id) {
      return _.find(this.panels, function(panel) {
        return panel.id === id;
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
    removePanel: function(panel) {
      this.panels = _.without(this.panels, panel);
      this.renderSidebar();
    },


    /**
     * Toggle the open state of a sidebar panel
     */
    togglePanel: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var panelId = $(e.target).parents('li').attr('data-panel'),
        panel = this.getPanel(panelId);

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

    defaultFilters: {
      keyword: null, // Keyword query
      created: true, // Show cards created by user
      subscribed: true, // Show card the user is subscribed to
      assigned: true, // Show cards the user has been assigned to
      dueDate: 'any', // Card due date: 'day', 'week', 'any'
      archived: false, // Show archived cards
      // closed: false // Show closed cards (cannot be done in a single query)
    },

    className: "sidebar-panel panel-filter",
    id: _.uniqueId('card-panel-'),

    template: jade.compile($("#template-card-filter-panel-view").text()),
    linkTemplate: jade.compile($("#template-card-filter-panel-link-view").text()),

    events: {
      'submit .js-filter-form': 'submitAction'
    },

    initialize: function() {
      this.context = this.options.context;
      this.filters = this.defaultFilters;
      return this;
    },

    /**
     * Render the sidebar and panels
     */
    render: function(context) {
      this.delegateEvents();
      this.$el.html(this.template(this.filters));
      return this;
    },

    /**
     * Get the sidebar link markup (gets called by the sidebar)
     * 
     * @return {object}
     */
    renderLink: function() {
      return $(this.linkTemplate({
        total: this.totalActiveFilters(),
        panel: this.id
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
      this.getFilters();
      this.collection.setFilters(this.morphFilters());
      this.collection.fetch({
        reset: true,
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
      this.filters = _.extend({}, this.defaultFilters, {
        keyword: this.$('.js-cardfilter-keyword').val(),
        created: this.$('.js-cardfilter-created').is(':checked'),
        subscribed: this.$('.js-cardfilter-subscribed').is(':checked'),
        assigned: this.$('.js-cardfilter-assigned').is(':checked'),
        dueDate: this.$('.js-cardfilter-dueDate:checked').val(),
        archived: this.$('.js-cardfilter-archived').is(':checked'),
        closed: this.$('.js-cardfilter-closed').is(':checked')
      });
      return this.filters;
    },


    /**
     * Get the total number of active filters
     * 
     * @return {integer}
     */
    totalActiveFilters: function() {
      var total = _.compact(_.toArray(this.filters)).length;

      // Any does not count as a filter
      if (this.filters.dueDate === 'any') {
        total--;
      }

      return total;
    },


    /**
     * Morph the filters into a query
     * 
     * @return {object}
     */
    morphFilters: function() {
      var morphed = {};

      // Build a regex for a keyword search
      if (_.isString(this.filters.keyword) && this.filters.keyword.length) {
        morphed.title = {
          $regex: this.filters.keyword,
          $options: 'gi'
        };
      }

      // The user must have either created, subscribed or assigned
      // Otherwise query cards they are assigned to
      // If they have one or more of these it will be an or query
      if (!this.filters.created && !this.filters.assigned && !this.filters.subscribed) {
        morphed.$or = [
          { creatorId: cantas.user.id },
          { assignees: cantas.user.id },
          { subscribeUserIds: cantas.user.id }
        ];
      } else {
        morphed.$or = [];

        // Filter cards created by the user
        if (this.filters.created === true) {
          morphed.$or.push({
            creatorId: cantas.user.id
          });
        }

        // Filter cards assigned to the user
        if (this.filters.assigned === true) {
          morphed.$or.push({
            assignees: cantas.user.id
          });
        }

        // Filter cards the user has subscribed to
        if (this.filters.subscribed === true) {
          morphed.$or.push({
            subscribeUserIds: cantas.user.id
          });
        }
      }

      // Show cards that are archived
      if (this.filters.archived === false) {
        morphed.isArchived = false;
      }

      // Get the due date range
      if (this.filters.dueDate && this.filters.dueDate !== 'any') {
        var range = this.getDateRange(this.filters.dueDate);
        morphed.dueDate = {
          $gte: {
            type: 'date',
            value: range.from
          },
          $lt: {
            type: 'date',
            value: range.to
          }
        };
      }

      return morphed;
    },


    /**
     * Get a datetime range for 'day', 'week' or 'month'
     * 
     * @return {object}
     */
    getDateRange: function(range) {
      var from = moment(),
        to = moment();

      if (range === 'day') {
        to.add('days', 1);
      }

      if (range === 'week') {
        to.add('weeks', 1);
      }

      if (range === 'month') {
        to.add('months', 1);
      }

      return {
        from: from,
        to: to
      };
    },


    remove: function() {
      this.undelegateEvents();
      this.$el.remove();
      this.stopListening();
    }

  });



  /**
   * Panel for sorting cards
   */
  cantas.views.CardSortPanelView = cantas.views.BaseView.extend({

    context: null,
    isOpen: false,

    defaultSort: {
      field: 'created',
      order: 'DESC'
    },

    className: "sidebar-panel panel-sort",
    id: _.uniqueId('card-panel-'),

    template: jade.compile($("#template-card-sort-panel-view").text()),
    linkTemplate: jade.compile($("#template-card-sort-panel-link-view").text()),

    events: {
      'submit .js-sort-form': 'submitAction'
    },

    initialize: function() {
      this.context = this.options.context;
      this.sort = this.defaultSort;
      return this;
    },

    /**
     * Render the sidebar and panels
     */
    render: function(context) {
      this.delegateEvents();
      this.$el.html(this.template(this.sort));
      return this;
    },

    /**
     * Get the sidebar link markup (gets called by the sidebar)
     */
    renderLink: function() {
      return $(this.linkTemplate({
        panel: this.id
      }));
    },

    submitAction: function(e) {
      e.preventDefault();
      this.sortCollection();
      this.context.renderSidebar();
    },

    /**
     * Read the currently set sort options and apply to collection
     */
    sortCollection: function() {
      $("body div.process-loading").show();
      this.getSortOptions();
      this.collection.setSort(this.morphSort());
      this.collection.fetch({
        reset: true,
        success: function() {
          $("body div.process-loading").hide();
        },
        error: function() {
          $("body div.process-loading").hide();
        }
      });
    },

    /**
     * Get sort options from the form 
     */
    getSortOptions: function() {
      this.sort = _.extend({}, this.defaultSort, {
        field: this.$('.js-cardsort-field:checked').val(),
        order: this.$('.js-cardsort-order:checked').val()
      });
      return this.sort;
    },

    /**
     * Morph the sort into a query
     */
    morphSort: function() {
      var morphed = {},
        order = (this.sort.order === 'ASC') ? 1 : -1;

      switch (this.sort.field) {
      case "board":
        morphed.boardId = order;
        break;
      case "due":
        morphed.dueDate = order;
        break;
      default:
        morphed.created = order;
        break;
      }

      morphed.title = 1;

      return morphed;
    },

    remove: function() {
      this.undelegateEvents();
      this.$el.remove();
      this.stopListening();
    }

  });


}(jQuery, _, Backbone));