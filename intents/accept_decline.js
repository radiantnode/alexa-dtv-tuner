module.exports = function (app, config)
{
  app.intent('Accept', {
    utterances: [
      'yes', 'ok', 'alright', 'sure'
    ]
  }, function(request, response){
    response.say("Alright I'll do it.");
  });

  app.intent('Decline', {
    utterances: [
      'no', 'cancel', 'nope', 'nevermind'
    ]
  }, function(request, response){
    response.send(); // do nothing just close the session
  });

}