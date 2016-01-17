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
        .then(function(data){
          if(data && data.LinearScheduleResult && data.LinearScheduleResult.Schedule) {
            var airings = data.LinearScheduleResult.Schedule.Airings,
                now = moment().unix(),
                foundIndex = _.findIndex(airings, function(a) {
                  return (
                           // the airing time + duration isn't past our current time
                           moment(a.AiringTime).add(a.Duration, 'minutes').unix() > now ||
                           // the airing time isn't past our current time
                           moment(a.AiringTime).unix() >= now
                         ) &&
                         // use snakeCase to normalize the names for easy search
                         // TODO: better considerations for punctuation like apostrophes
                         _.snakeCase(a.Title) == _.snakeCase(show_name);
                }),

                showDetails,
                showTime,
                channelInfo;

            if(foundIndex != -1) {
              showDetails = airings[foundIndex];
              showTime = moment(showDetails.AiringTime),
              channelInfo = channels.getChannelInfoByCallsign(showDetails.CallLetters);

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

  function getListings (duration)
  {
    return request({ url: config.url, json: true });
  }

  return module;
};