/**
 * Phone Verification Page Function
 * Serves phone-verification.html from public assets
 */

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();

  // Redirect to the public asset URL
  response.setStatusCode(302);
  response.appendHeader('Location', '/phone-verification.html');

  return callback(null, response);
};
