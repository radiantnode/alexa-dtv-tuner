/**
 * Module with helpers for getting listings from the Rovi API
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var _ = require('lodash');
var config = require('../config/config');
var mysql = require('mysql');
var connection = mysql.createConnection(config.database);
var moment = require('moment');
var Promise = require("bluebird");
var channels = require('./channels');

module.exports = function (config) {
  var module = {
    errorTypes: {
      SHOW_NOT_FOUND: 404,
      CHANNEL_NOT_FOUND: 405
    }
  };

  module.findShow = function (show_name)
  {
    return new Promise(function(resolve, reject){
      var now = moment().utc().format('YYYY-MM-DD HH:mm:ss');

      getListings(show_name, now)
        .then(function(airings){
          if(!airings.length > 0) return reject(module.errorTypes.SHOW_NOT_FOUND);

          var latestAiring = airings.shift(),
              showTime = moment(latestAiring.AiringTime),
              otherAirings = airings,
              channelInfo = channels.getChannel(latestAiring.ChannelNumber);

          if(!channelInfo) return reject(module.errorTypes.CHANNEL_NOT_FOUND);

          resolve({
            title:           latestAiring.Title,
            description:     latestAiring.Copy,
            channel:         channelInfo,
            airing: {
              now:   showTime.isBefore(moment()),
              human: showTime.fromNow()
            },
            otherAirings: otherAirings.length > 0 ? _.map(otherAirings, function(other){
              return moment(other.AiringTime).format('hA')
            }) : null
          });

        });

    });

  }

  // private

  function normalize (string) {
    return string.toLowerCase().replace(/\W/g, '');
  }

  function getListings (show_name, now)
  {
    return new Promise(function(resolve, reject){
      connection.query(
        'SELECT * from entries where Title = ? AND AiringTime > ? ORDER BY AiringTime ASC',
        [show_name, now],
        function(err, results){
          if(err) reject(err)
          else    resolve(results)
        }
      );
    });
  }

  return module;
};