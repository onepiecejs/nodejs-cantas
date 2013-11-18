(function(module) {

  var settings = require("../settings");

  module.exports.currentSite = function() {
    var currentPhase = settings.sites.currentPhase;
    console.log(currentPhase);
    return settings.sites.phases[currentPhase];
  };

}(module));
