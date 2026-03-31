/**
 * Stytch Results Page Function
 * Serves stytch-results.html from public assets
 */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();

  // Redirect to the public asset URL
  response.setStatusCode(302);
  response.appendHeader('Location', '/stytch-results.html');

  return callback(null, response);
};
