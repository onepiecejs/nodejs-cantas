/*
 * Vote and Comment status.
 */

(function (module) {

  'use strict';

  module.exports = {
    // Vote/Comment is disabled, nobody can vote on a card.
    disabled: 'disabled',
    // Vote/Comment is enabled, and avialable to board members only.
    enabled: 'enabled',
    // Vote/Comment is opened for everyone in Cantas.
    opened: 'opened'
  };

  module.exports.configDescription = {
    disabled: 'Disable',
    enabled: 'Public for Board Member',
    opened: 'Public for Every User'
  };

}(module));
