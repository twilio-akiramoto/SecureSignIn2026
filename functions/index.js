/**
 * Index/Signup Page Function
 * Serves index.html from public assets
 */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();

  // Redirect to the public asset URL
  response.setStatusCode(302);
  response.appendHeader('Location', '/index.html');

  return callback(null, response);
};
