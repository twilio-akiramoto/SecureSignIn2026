exports.handler = function(context, event, callback) {
  // Read the HTML asset
  const assets = Runtime.getAssets();
  const asset = assets['/stytch-results.html'];
  const assetPath = asset.path;

  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.setHeader('Content-Type', 'text/html');
  response.setBody(require('fs').readFileSync(assetPath, 'utf8'));

  return callback(null, response);
};
