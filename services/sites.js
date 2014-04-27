(function(module) {

  var settings = require("../settings");

  module.exports.currentSite = function() {
    var currentPhase = settings.sites.currentPhase;
    return settings.sites.phases[currentPhase];
  };

}(module));
