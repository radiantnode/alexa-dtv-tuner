/**
 * Alexa DirecTV Tuner Skill
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var config = require('./config/config');
var AlexaSkill = require('./lib/AlexaSkill');
var DTV = require('./lib/DTV')(config.dtv);
var listings = require('./lib/listings')(config.listings);

var AlexaDTVTunerSkill = function () {
  AlexaSkill.call(this, config.app_id);
};

AlexaDTVTunerSkill.prototype = Object.create(AlexaSkill.prototype);
AlexaDTVTunerSkill.prototype.constructor = AlexaDTVTunerSkill;

// Event handlers
// AlexaDTVTunerSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {};
// AlexaDTVTunerSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {};

/**
 * If the user launches without specifying an intent, route to the correct function.
 */
AlexaDTVTunerSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
  response.tell('Welcome to DirecTV Tuner!');
};

AlexaDTVTunerSkill.prototype.intentHandlers = {
  /**
   * Responds to the user saying 'what show is this?'
   */
  GetCurrentProgramIntent: function (intent, session, response)
  {
    DTV.getCurrentProgramInfo()
      .then(function(program){
        response.tell('You are watching "' + program.title + '" on ' + program.channel.Name);
      })
      .catch(function(error){
        if(error === DTV.errorTypes.INSUFFICIENT_PROGRAM_INFO) {
          response.tell("Sorry, I don't know enough about this program.")
        } else {
          response.tell("The reciever doesn't appear to be on. Turn the reciever on and try again.");
        }

      });
  },

  /**
   * Responds to the user saying 'tune to channel {ChannelNumber}'
   */
  TuneToChannelNumberIntent: function (intent, session, response)
  {
    var channelNumber = intent.slots.ChannelNumber.value;
    DTV.tuneToChannel(channelNumber)
      .then(function(){
        response.tell('OK.');
      })
      .catch(function(error, msg){
        if(error === DTV.errorTypes.DTV_CHANNEL_DOES_NOT_EXIST) {
          response.tell('The channel ' + channelNumber + ' is not available');
        } else {
          response.tell('Sorry, an error occurred while trying to change the channel.')
        }

      });
  },

  /**
   * Responds to the user saying 'tune to channel {ChannelName}'
   */
  TuneToChannelNameIntent: function (intent, session, response)
  {
    var channelName = intent.slots.ChannelName.value;

    if(channelName == 'discovery') {
      tuneToChannelNumber(response, 278);
    } else if (channelName == 'history') {
      tuneToChannelNumber(response, 269);
    } else if (channelName == 'AMC') {
      tuneToChannelNumber(response, 254);
    } else {
      response.tell("I don't know that channel.");
    }

  },

  /**
   * Responds to the user saying 'turn on'
   */
  PowerOnIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.POWER_ON);
  },

  /**
   * Responds to the user saying 'turn on'
   */
  PowerOffIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.POWER_OFF);
  },

  /**
   * Responds to the user saying 'play'
   */
  PlayIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.PLAY);
  },

  /**
   * Responds to the user saying 'pause'
   */
  PauseIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.PAUSE);
  },

  /**
   * Responds to the user saying 'record this'
   */
  RecordIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.RECORD);
  },

  /**
   * Responds to the user saying 'replay'
   */
  ReplayIntent: function (intent, session, response)
  {
    keyPress(response, DTV.keyTypes.REPLAY);
  },

  /**
   * Responds to the user saying 'is {ShowName} on?'
   */
  FindShowIntent: function (intent, session, response)
  {
    var showName = intent.slots.ShowName.value;

    listings.findShow(showName)
      .then(function(show){
        var speech = '"' + show.title + '"';

        if(show.airing.now) {
          speech += ' is on! It started ' + show.airing.human + ' on ' + show.channel.Name + '. ';
          speech += 'Want me to turn it on? ';
        } else {
          speech += ' starts ' + show.airing.human + ' on ' + show.channel.Name + '. ';
          speech += 'Want me to turn on ' + show.channel.Name + '? ';
        }

        if(show.otherAirings && show.description) {
          speech += 'You can also ask for other showings or a description.';
        } else if(show.otherAirings) {
          speech += 'You can also ask for other showings.';
        } else if (show.description) {
          speech += 'You can also ask for a description.';
        }

        session.attributes.awaitingAction = ['TUNE_TO_SHOW', show];
        response.ask(speech, 'You can say yes or no.');
      })
      .catch(function(error){
        if(error == listings.errorTypes.SHOW_NOT_FOUND || error == listings.errorTypes.CHANNEL_NOT_FOUND) {
          // console.log(error)
          response.tell("\"" + showName + "\" isn't on right now.")
        } else {
          console.log('ERROR: ' + error);
        }

      });

  },

  /**
   * Responds to the user saying 'description'
   */
  ShowDescriptionIntent: function (intent, session, response)
  {
    if(session.attributes.awaitingAction)
    {
      var awaiting = session.attributes.awaitingAction,
          action = awaiting[0],
          data = awaiting[1];

      if(action == 'TUNE_TO_SHOW') {
        var repromptText = 'Would you like me to turn on ' + data.channel.Name + '?';

        response.ask({
          speech: '<speak>' +
            data.description +
            '<break time="0.5s"/>' +
            repromptText +
            '</speak>',
            type: AlexaSkill.speechOutputType.SSML
          },
          repromptText + ' You can say yes or no.'
        );
      }

    } else {
      response.tell('Not sure what to do here. Bye.');
    }

  },

  /**
   * Responds to the user saying 'other showings'
   */
  OtherShowingsIntent: function (intent, session, response)
  {
    if(session.attributes.awaitingAction)
    {
      var awaiting = session.attributes.awaitingAction,
          action = awaiting[0],
          data = awaiting[1];

      if(action == 'TUNE_TO_SHOW') {
        var repromptText = 'Would you like me to turn on ' + data.channel.Name + '?';

        response.ask({
          speech: '<speak>' +
            '"' + data.title + '" is on again at ' +
            data.otherAirings.join(' and ') +
            '<break time="0.5s"/>' +
            repromptText +
            '</speak>',
            type: AlexaSkill.speechOutputType.SSML
          },
          repromptText + ' You can say yes or no.'
        );
      }

    } else {
      response.tell('Not sure what to do here. Bye.');
    }

  },

  /**
   * Responds to the user saying 'yes', 'ok', etc.
   */
  YesIntent: function (intent, session, response)
  {
    if(session.attributes.awaitingAction)
    {
      var awaiting = session.attributes.awaitingAction,
          action = awaiting[0],
          data = awaiting[1];

      if(action == 'TUNE_TO_SHOW') {
        tuneToChannelNumber(response, data.channel.Number);
      }

    } else {
      response.tell('OK.');
    }

  },

  /**
   * Responds to the user saying 'no', 'cancel', etc.
   */
  NoIntent: function (intent, session, response)
  {
    response.tell('');
  },

  /**
   * Responds to the user saying 'help'
   */
  'AMAZON.HelpIntent': function (intent, session, response)
  {
    var speechText = 'You can say things like <break time="0.1s" /> "tune to channel 501"';
    var repromptText = 'Try saying something like <break time="0.1s" /> "tune to channel 501"';

    response.ask(speechText, repromptText);
  },

  /**
   * Responds to the user saying 'stop'
   */
  'AMAZON.StopIntent': function (intent, session, response)
  {
    response.tell('OK.');
  }

};

function keyPress (response, key)
{
  DTV.keyPress(key)
    .then(function(){
      response.tell('OK.');
    });
}

function tuneToChannelNumber (response, channelNumber)
{
  DTV.tuneToChannel(channelNumber)
    .then(function(){
      response.tell('OK.');
    })
    .catch(function(error, msg){
      if(error === DTV.errorTypes.DTV_CHANNEL_DOES_NOT_EXIST) {
        response.tell('The channel ' + channelNumber + ' is not available');
      } else {
        response.tell('Sorry, an error occurred while trying to change the channel.')
      }

    });
}

// --------------------------------------------------------------------------

// TEST STUBBING:

// AlexaDTVTunerSkill.prototype.intentHandlers.TuneToChannelNameIntent({
//   slots: { ChannelName: { value: 'AMC' } }
// }, {}, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   }
// });

// AlexaDTVTunerSkill.prototype.intentHandlers.TuneToChannelNumberIntent({
//   slots: { ChannelNumber: { value: '321' } }
// }, {}, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   }
// });

// AlexaDTVTunerSkill.prototype.intentHandlers.GetCurrentProgramIntent({}, {}, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   }
// });

// AlexaDTVTunerSkill.prototype.intentHandlers.PauseIntent({}, {}, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   }
// });

// AlexaDTVTunerSkill.prototype.intentHandlers.PowerOnIntent({}, {}, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   }
// });

// AlexaDTVTunerSkill.prototype.intentHandlers.FindShowIntent({
//   slots: { ShowName: { value: "Ridiculousness" } }
// }, { attributes: {} }, {
//   tell: function(words) {
//     console.log('TELL: ' + words);
//   },
//   ask: function(words) {
//     console.log('ASK: ' + words);
//   }
// });

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
  var skill = new AlexaDTVTunerSkill();
  skill.execute(event, context);
};