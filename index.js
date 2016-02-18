/**
 * Alexa DirecTV Tuner Skill
 * https://github.com/radiantnode/alexa-dtv-tuner
 */

'use strict';

var fs          = require('fs'),
    express     = require('express'),
    morgan      = require('morgan'),
    bodyParser  = require('body-parser'),
    config      = require('./config/config'),
    express_app = express(),
    alexa       = require('alexa-app'),
    app         = new alexa.app('alexa-dtv-tuner');

// Auto-load intents
var intents = fs.readdirSync('./intents');
for(var i in intents) {
  require('./intents/' + intents[i])(app, config);
}

if(process.argv.indexOf('--schema') != -1)
{
  console.log(app.schema());
  console.log(app.utterances());
}
else
{
  // Express middleware
  express_app.use(bodyParser.json());
  express_app.use(morgan('combined'));

  // Route express requsts to the alexa handler
  express_app.post('/', function(req, res) {
    app.request(req.body)
      .then(function(response) {
        res.json(response);
      });
  });

  express_app.listen(process.env.PORT || 3000);
}