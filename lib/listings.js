/**
 * Module with helpers for getting listings from the Rovi API
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var _          = require('lodash'),
    config     = require('../config/config'),
    mysql      = require('mysql'),
    connection = mysql.createConnection(config.database),
    moment     = require('moment-timezone'),
    Promise    = require("bluebird"),
    channels   = require('./channels');

module.exports = function () {
  var module = {
    errorTypes: {
      SHOW_NOT_FOUND: 404,
      CHANNEL_NOT_FOUND: 405
    }
  };

  module.findShow = function (show_name)
  {
    return new Promise(function(resolve, reject){
      getListings(show_name)
        .then(function(airings){
          if(!airings.length > 0) return reject(module.errorTypes.SHOW_NOT_FOUND);

          var latestAiring = airings.shift(),
              showTime     = moment.utc(latestAiring.AiringTime).tz(config.timezone),
              otherAirings = airings,
              channelInfo  = channels.getChannel(latestAiring.ChannelNumber);

          if(!channelInfo) return reject(module.errorTypes.CHANNEL_NOT_FOUND);

          resolve({
            title:       latestAiring.Title,
            description: latestAiring.Copy,
            channel:     channelInfo,
            airing: {
              now:   showTime.isBefore(moment()),
              human: showTime.fromNow()
            },

            otherAirings: otherAirings.length > 0 ? _.map(otherAirings, function(other){
              return moment.utc(other.AiringTime).tz(config.timezone).format('hA')
            }) : null

          });

        });

    });

  }

  // private

  function getListings (show_name)
  {
    return new Promise(function(resolve, reject){
      connection.query(
        "SELECT * FROM entries WHERE Title LIKE ? AND (AiringTime > NOW() OR DATE_ADD(AiringTime, INTERVAL Duration MINUTE) > NOW()) GROUP BY AiringTime ORDER BY AiringTime ASC",
        ['%' + show_name + '%'],
        function(err, results){
          if(err) reject(err)
          else    resolve(results)
        }

      );
    });

  }

  return module;
};