module.exports = function (app, config)
{
  var listings = require('../lib/listings')(config.listings);

  app.intent('FindProgram', {
    slots: {
      "ShowName":"LIST_OF_SHOWS"
    },
    utterances: [
      "is {family guy|ShowName} on",
      "put on {ridiculousness|ShowName}"
    ]
  }, function(request, response){
    var showName = request.slot('ShowName');

    listings.findShow(showName)
      .then(function(show){
        var promptSpeech = channelFoundSpeech(show);

        response.session('awaitingAction', ['TUNE_TO_SHOW', show]);

        response.shouldEndSession = false;
        response
          .say(promptSpeech, 'You can say yes or no.')
          .send();
      })
      .catch(function(error){
        if(error == listings.errorTypes.SHOW_NOT_FOUND || error == listings.errorTypes.CHANNEL_NOT_FOUND) {
          response
            .say("\"" + showName + "\" isn't on right now.")
            .send();
        } else {
          console.log('ERROR: ' + error);
          response
            .say('An error occurred')
            .send();
        }

      });

    return false;
  });

  app.intent('OtherShowings', {
    utterances: [
      'other showings', 'other times', 'times', 'showings'
    ]
  }, function(request, response){
    var sessionData = response.session('awaitingAction');

    if(sessionData)
    {
      var action = sessionData[0],
          show = sessionData[1];

      if(action == 'TUNE_TO_SHOW') {
        var repromptText = 'Would you like me to turn on ' + show.channel.Name + '?';

        var speechText = '"' + show.title + '" is on again at ' +
          show.otherAirings.join(' and ') +
          '<break time="0.5s"/>' +
          repromptText;

        response.say(speechText, repromptText);
      }

    } else {
      response.say('Not sure what to do here. Bye.');
    }

  });

  app.intent('ShowDescription', {
    utterances: [
      'description', 'tell me more'
    ]
  }, function(request, response){
    var sessionData = response.session('awaitingAction');

    if(sessionData)
    {
      var action = sessionData[0],
          show = sessionData[1];

      if(action == 'TUNE_TO_SHOW' && show.description) {
        var repromptText = 'Would you like me to turn on ' + show.channel.Name + '?';

        var speechText = show.description +
          '<break time="0.5s"/>' +
          repromptText;

        response.say(speechText, repromptText);
      }

    } else {
      response.say('Not sure what to do here. Bye.');
    }

  });

  function channelFoundSpeech (show)
  {
    var channelName = show.channel.Name,
        channelName = show.airing.human,
        speech = '"' + show.title + '"';

    if(show.airing.now) {
      speech += ' is on! It started ' + humanTime + ' on ' + channelName + '. ';
      speech += 'Want me to turn it on? ';
    } else {
      speech += ' starts ' + humanTime + ' on ' + channelName + '. ';
      speech += 'Want me to turn on ' + channelName + '? ';
    }

    if(show.otherAirings && show.description) {
      speech += 'You can also ask for other showings or a description.';
    } else if(show.otherAirings) {
      speech += 'You can also ask for other showings.';
    } else if (show.description) {
      speech += 'You can also ask for a description.';
    }

    return speech;
  }

}