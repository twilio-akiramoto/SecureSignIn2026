const fs = require('fs');

exports.handler = function(context, event, callback) {
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.appendHeader('Content-Type', 'text/html');

  try {
    // Debug: Log available assets
    const assets = Runtime.getAssets();
    console.log('Available assets:', Object.keys(assets));

    // Try multiple asset path formats
    let assetPath;
    if (assets['/phone-verification.html']) {
      assetPath = assets['/phone-verification.html'].path;
    } else if (assets['phone-verification.html']) {
      assetPath = assets['phone-verification.html'].path;
    } else if (assets['/phone-verification.html'].open) {
      // Use open() method if available
      assetPath = assets['/phone-verification.html'].open();
    } else {
      throw new Error('Asset phone-verification.html not found. Available: ' + Object.keys(assets).join(', '));
    }

    const html = fs.readFileSync(assetPath, 'utf8');
    response.setBody(html);
    return callback(null, response);
  } catch (error) {
    console.error('Error loading phone-verification.html:', error);
    response.setStatusCode(500);
    response.setBody(`<h1>Error loading page</h1><pre>${error.message}</pre>`);
    return callback(null, response);
  }
};
