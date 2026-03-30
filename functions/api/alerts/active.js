exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(204);
    return callback(null, response);
  }

  // Return empty alerts array
  response.setStatusCode(200);
  response.setBody({
    alerts: []
  });

  return callback(null, response);
};
