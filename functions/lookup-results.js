exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'text/html');

  // Read the HTML asset
  const asset = Runtime.getAssets()['/lookup-results.html'];
  response.setBody(asset.open());

  return callback(null, response);
};
