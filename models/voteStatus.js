/*
 * Vote status.
 */

(function (module) {

  'use strict';

  module.exports = {
    // Vote is disabled, nobody can vote on a card.
    disabled: 'disabled',
    // Vote is enabled, and avialable to board members only.
    enabled: 'enabled',
    // Vote is opened for everyone in Cantas.
    opened: 'opened'
  };

}(module));
