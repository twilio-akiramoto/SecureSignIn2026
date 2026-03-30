const path = require('path');
const fs = require('fs');

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'text/html');

  // Read the HTML file
  const htmlPath = path.join(__dirname, '..', 'assets', 'preferences.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  response.setBody(html);

  return callback(null, response);
};
