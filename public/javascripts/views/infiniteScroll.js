(function ($, _, Backbone) {

  "use strict";

  /**
   * Infinite scroll view
   */
  cantas.views.InfiniteScrollView = cantas.views.BaseView.extend({

    id: _.uniqueId('infinite-scroll-'),

    // Distance from the bottom ov the view to trigger the collection fetch
    offset: 100,

    // Callback for when the next page is triggered
    nextCallback: null,

    // Current page number
    page: 1,

    // Are we on the last page
    lastPage: false,

    // Record the length of the collection
    previousLength: 0,

    initialize: function(options) {
      _.bindAll(this, "reset", "attachWaypoint");

      if (_.isFunction(options.next)) {
        this.nextCallback = options.next;
      }

      this.listenTo(this.collection, "reset", this.reset);

      // Attach the initial waypoint
      this.attachWaypoint();
    },

    /**
     * Adds a waypoint to the end of the scroll view
     */
    attachWaypoint: function() {

      // Remove the current waypoint
      this.$('.infinite-waypoint').remove();

      // Check if we are on the last page
      if (this.collection.size() === this.previousLength) {
        this.lastPage = true;
        return;
      }

      var waypointId = _.uniqueId('waypoint-'),
        self = this,
        loadAction = _.once(this.loadMore);

      // Record the previous length of the collection
      this.previousLength = this.collection.size();

      // Append the waypoint element
      this.$el.append('<a class="infinite-waypoint" id="' + waypointId + '"></a>');
      var $waypoint = this.$('.infinite-waypoint');

      // Create a waypoint
      _.defer(function() {
        $waypoint.waypoint(function(direction) {
          if (direction !== "down" || self.lastPage) {
            return;
          }

          var nextPage =  ++self.page;

          if (self.next) {
            self.next(nextPage);
          }

          self.renderLoading();

          loadAction(self.collection, nextPage, function() {
            self.removeLoading();
            // Attach a new waypoint on success
            self.attachWaypoint();
          });
        }, {
          context: self.$el,
          offset: function() {
            return (self.$el.height() + self.offset);
          },
          onlyOnScroll: true
        });
      });
    },

    /**
     * Load more reults to the view
     */
    loadMore: function(collection, page, callback) {
      if (collection) {
        collection.setPage(page).fetch({
          add: true,
          remove: false,
          success: function(collection) {
            callback(collection);
          }
        });
      }
    },

    reset: function() {
      this.previousLength = 0;
      this.lastPage = false;
      this.page = 1;
      this.$el.scrollTop(0);

      // Defer attaching the waypoint to make sure we are at the top of the scrollview
      _.defer(this.attachWaypoint);
    },

    /**
     * Append loading view
     */
    renderLoading: function() {
      this.$el.append('<div class="infinite-scroll-loading">Loading...</div>');
    },

    removeLoading: function() {
      this.$('.infinite-scroll-loading').remove();
    },

    close: function() {
      this.collection.reset();
      this.remove();
    }

  });


}(jQuery, _, Backbone));