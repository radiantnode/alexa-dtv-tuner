'use strict';

var _ = require('lodash');
var channelConfig = require('../config/channels');

module.exports = function ()
{
  var module = {};

  module.getChannel = function (number)
  {
    return sanitize(channelConfig[
      _.findIndex(channelConfig, function(c){
        return c.Number == _.parseInt(number, 10);
      })
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