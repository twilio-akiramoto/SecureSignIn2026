exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  // Secure CORS: Allow same-origin or configured domains only
  const origin = event.request?.headers?.origin || event.request?.headers?.referer;
  const allowedOrigins = context.ALLOWED_ORIGINS
    ? context.ALLOWED_ORIGINS.split(',')
    : [];

  // Allow same domain (Twilio Functions domain)
  if (origin && (origin.includes('.twil.io') || allowedOrigins.includes(origin))) {
    response.appendHeader('Access-Control-Allow-Origin', origin);
    response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(204);
    return callback(null, response);
  }

  // Return empty alerts array (stub endpoint)
  response.setStatusCode(200);
  response.setBody({
    alerts: []
  });

  return callback(null, response);
};
