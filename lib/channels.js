'use strict';

var _ = require('lodash');
var channelConfig = require('../config/channels');

module.exports = function ()
{
  var module = {};

  module.getChannelInfoByCallsign = function (callsign)
  {
    return sanitize(channelConfig[
      _.findIndex(channelConfig, function(c){ return c.Callsign.toLowerCase() == callsign.toLowerCase() })
    ]);
  }

  function sanitize (data)
  {
    if(data) {
      data['Name'] = data.Name.replace(/\sHD/, '');
    }

    return data;
  }

  return module;
}();