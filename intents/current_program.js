module.exports = function(app, config)
{
  var DTV = require('../lib/DTV')(config.dtv);

  app.intent('CurrentProgram', {
    utterances: [
      "what is this",
      "what show is this",
      "what's playing"
    ]
  }, function(request, response) {
    DTV.getCurrentProgramInfo()
      .then(function(program){
        response
          .say('You are watching "' + program.title + '" on ' + program.channel.Name)
          .send();
      })
      .catch(function(error){
        if(error === DTV.errorTypes.INSUFFICIENT_PROGRAM_INFO) {
          response.say("Sorry, I don't know enough about this program.");
        } else {
          response.say("The reciever doesn't appear to be on. Turn the reciever on and try again.");
        }

        response.send();
      });

    return false;
  });

}