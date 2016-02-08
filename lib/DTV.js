/**
 * Module with helpers for controlling a DirecTV reciever via the built in API
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var _ = require('lodash');
var request = require('request-promise');
var Promise = require("bluebird");
var channels = require('../lib/channels');

module.exports = function (config) {
  var module = {
    errorTypes: {
      DTV_INTERNAL_ERROR:         500,
      INSUFFICIENT_PROGRAM_INFO:  700,
      UNKNOWN_CHANNEL:            404
    },

    keyTypes: {
      POWER_ON:  'poweron',
      POWER_OFF: 'poweroff',
      PLAY:      'play',
      PAUSE:     'pause',
      RECORD:    'record',
      REPLAY:    'replay'
    }
  };

  module.getCurrentProgramInfo = function (callback, error_callback)
  {
    return new Promise(function(resolve, reject){
      get('/tv/getTuned')
        .then(function(data){
          // make sure we have sufficient data
          if(data.title && data.callsign) {
            var resolved = transformProgramInfo(data);
            if(resolved) {
              resolve(resolved);
            } else {
              reject(models.errorTypes.UNKNOWN_CHANNEL);
            }

          } else {
            reject(module.errorTypes.INSUFFICIENT_PROGRAM_INFO);
          }

        })
        .catch(reject);
    });
  }

  module.tuneToChannel = function (channel_number)
  {
    return get('/tv/tune', { qs: { major: channel_number } });
  }

  module.keyPress = function (key)
  {
    return get('/remote/processKey', { qs: { key: key } });
  }

  // private

  function get (path, options)
  {
    return new Promise(function(resolve, reject){
      var requestOpts = _.merge({
        url: config.receiver_url + path,
        json: true
      }, options);

      request(requestOpts)
        .then(resolve)
        .catch(function(data){
          var statusCode,
              errorMessage,
              errorType;

          // catch DTV specific errors
          if(data && data.statusCode && data.error && data.error.status) {
            statusCode = data.statusCode;
            errorMessage = data.error.status.msg;

            // TODO: better considerations for more error types
            if(errorMessage.match(/channel does not exist/i)) {
              statusCode = module.errorTypes.UNKNOWN_CHANNEL;
            } else {
              statusCode = module.errorTypes.DTV_INTERNAL_ERROR;
            }

            reject(statusCode, errorMessage);
          // everything else
          } else {
            reject(data);
          }

        });

    });
  }

  function transformProgramInfo (data)
  {
    var chLookup = channels.getChannel(data.major);

    if(!chLookup) return false;

    return {
      title:         data.title,
      channel:       chLookup,
      rating:        data.rating,
      isRecording:   data.isRecording,
      duration:      data.duration,
      offset:        data.offset
    };
  }

  return module;
};