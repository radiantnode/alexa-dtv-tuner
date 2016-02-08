module.exports = function(app, config) {
  app.launch(function(request,response) {
    response.say('Welcome to the DTV tuner!');
  });

}