const fs = require('fs');

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'text/html');

  try {
    // Access asset using Runtime.getAssets() for deployed Functions
    const assetPath = Runtime.getAssets()['/lookup-results.html'].path;
    const html = fs.readFileSync(assetPath, 'utf8');

    response.setBody(html);
    return callback(null, response);
  } catch (error) {
    console.error('Error loading lookup-results.html:', error);
    response.setStatusCode(500);
    response.setBody('<h1>Error loading page</h1>');
    return callback(null, response);
  }
};
