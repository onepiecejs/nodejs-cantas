/*
 * Cantas' BaseModel
 *
 * BaseModel provides high level control of all model object in Cantas.
 * All Cantas' models should inherit from BaseModel rather than Backbone.Model. 
 */

$(function ($, _, Backbone) {

  "use strict";

  /*
   * Base class for all models within Cantas projects.
   *
   * BaseModel supports a set of socket events via ioBind happening on a
   * specific model. These events includes update and delete, and default event
   * handlers are provided named `serverChange` and `serverDelete`
   * respectively.
   *
   * `cantas.socket` is used for socket communication used by ioBind.
   *
   * Besides all methods of Backbone's Model, BaseModel defines another method
   * named `patch` for you as a convenient way for saving in patch mode.
   *
   * When an object of this Model is never used, remember to call `dispose`.
   *
   * How to customization your own model.
   * - `urlRoot` must be specified when define your own model for a feature.
   * - override `serverChange` or `serverDelete` if necessary.
   */
  cantas.models.BaseModel = Backbone.Model.extend({
    idAttribute: "_id",
    socket: cantas.socket,
    urlRoot: undefined,
    noIoBind: false,

    url: function() {
      if (this.urlRoot === undefined || typeof this.urlRoot !== "string")
        throw new TypeError("urlRoot is not well-defined.");

      return "/" + this.urlRoot + "/" + this.id;
    },

    initialize: function (attributes, options) {
      this.on('modelCleanup', this.modelCleanup, this);
      if (!this.noIoBind) {
        this.ioBind('update', this.serverChange, this);
        this.ioBind('delete', this.serverDelete, this);
      }
    },

    /*
     * Event happened in the server-side when this object is changed.
     */
    serverChange: function (data) {
      this.set(data);
    },

    /*
     * Event happened in the server-side when this object is deleted.
     */
    serverDelete: function (data) {
      if (this.collection) {
        this.collection.remove(this);
      } else {
        this.trigger('remove', this);
      }
    },

    /*
     * Remove all event handlers bound via ioBind.
     */
    modelCleanup: function () {
      this.ioUnbindAll();
      return this;
    },

    /*
     * Support Backbone's patch option to save method.
     *
     * Method keeps the default behavior of Backbone.Model.save except that
     * options.patch is set to true.
     *
     * Return value is what is returned by Backbone.Model.save
     */
    patch: function(attributes, options) {
      var opts = options || {};
      opts.patch = true;
      return this.save(attributes, opts);
    },

    /*
     * Public interface called to release all resource reserved by this model,
     * including memory, any event listeners.
     * 
     * By default, BaseModel removes all event listeners on this model and all
     * socket event listeners used by ioBind.
     */
    dispose: function() {
      this.off();
      if (!this.noIoBind)
        this.ioUnbindAll();
      return this;
    }

  });

  /*
   * Baes collection for all collections in Cantas.
   *
   * CollectionModel supports create event of an object of a Model via ioBind
   * happening on a specific model. Once an object of a model is created,
   * `serverCreate` is called by passing that object.
   *
   * `cantas.socket` is used for socket communication used by ioBind.
   *
   * When an object of this Collection is never used, remember to call
   * `dispose`.
   *
   * How to customization your own model.
   * - `url` must be specified when define your own model for a feature.
   * - override `serverCreate` if necessary.
   */
  cantas.models.BaseCollection = Backbone.Collection.extend({
    socket: cantas.socket,
    noIoBind: false,

    initialize: function() {
      /*
       * FIXME: it seems this line of code is not necessary due to serverCreate
       * is defined in `this` already.
       *
       * Ref: http://underscorejs.org/#bindAll
       */
      _.bindAll(this, "serverCreate");
      this.bindCreateEvent(this.socket);
    },

    getServerCreateEventName: function() {
      return this.url + ":create";
    },

    /*
     * FIXME: use ioBind method to bind socket events.
     *
     * This implementation has limitation of use of arbitrary Collection. That
     * is only the last created object of a Collection can receive expecting
     * socket event, such as create, update or others.
     *
     * By calling function dispose of a Model or Collection, all event
     * listeners registered while initializing within a View are removed and
     * event polution can be avoided in a natural way.
     *
     * Ref: https://github.com/logicalparadox/backbone.iobind#iobind
     */
    bindCreateEvent: function(socket) {
      var serverChangeName = this.getServerCreateEventName();
      socket.removeAllListeners(serverChangeName);
      socket.on(serverChangeName, this.serverCreate, this);
    },

    /*
     * Respond to event named activities:create from server-side.
     * By default, the newly created object is added to this collection.
     */
    serverCreate: function(data) {
      this.add(data);
    },

    /*
     * Remove all event listeners.
     *
     * By default, BaseCollection does following actions
     * - each element's event handlers is removed referencing BaseModel's
     *   dispose function.
     * - remove event listners registered on and for this collection.
     */
    dispose: function() {
      this.forEach(function(item, index) {
        item.dispose();
      });
      this.off();
      if (!this.noIoBind)
        this.ioUnbindAll();
      return this;
    }

  });

}(jQuery, _, Backbone))
