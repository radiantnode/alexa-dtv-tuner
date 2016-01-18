/**
 * Module with helpers for getting listings from the Rovi API
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var _ = require('lodash');
var request = require('request-promise');
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
      getListings()
        .then(function(airings){
          if(airings) {
            var now = moment().unix(),
                // find the show by looping through all the airings until we get a match
                foundIndex = _.findIndex(airings, function(a) {
                  return (
                     // the airing time + duration isn't past our current time
                     moment(a.AiringTime).add(a.Duration, 'minutes').unix() > now ||
                     // the airing time isn't past our current time
                     moment(a.AiringTime).unix() >= now
                   ) &&
                   // normalize string for search
                   normalize(a.Title) === normalize(show_name);
                }),

                showDetails,
                showTime,
                channelInfo;

            if(foundIndex != -1) {
              showDetails = airings[foundIndex];
              showTime = moment(showDetails.AiringTime),
              channelInfo = channels.getChannel(showDetails.CallLetters, showDetails.Channel);

              if(!channelInfo) reject(module.errorTypes.CHANNEL_NOT_FOUND);

              resolve({
                title:           showDetails.Title,
                description:     showDetails.Copy,
                channel:         channelInfo,
                airing: {
                  now:   showTime.isBefore(moment()),
                  human: showTime.fromNow()
                }

              });

            } else {
              reject(module.errorTypes.SHOW_NOT_FOUND);
            }

          }

        });

    });

  }

  // private

  function normalize (string) {
    return string.toLowerCase().replace(/\W/g, '');
  }

  function getListings (duration)
  {
    return request({ url: config.url, json: true });
  }

  return module;
};