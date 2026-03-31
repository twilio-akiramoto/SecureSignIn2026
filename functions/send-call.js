/**
 * Send Call Function
 * Makes outbound voice call using Twilio Voice API
 */

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
    response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  try {
    // Validate inputs
    const validCallTypes = ['order-confirmation', 'fraud-alert'];
    if (!event.call_type || !validCallTypes.includes(event.call_type)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid call type'
      });
      return callback(null, response);
    }

    if (!event.phone_number || !/^\+[1-9]\d{1,14}$/.test(event.phone_number)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid phone number'
      });
      return callback(null, response);
    }

    // Load Twilio helper
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Get TwiML URL from environment variables (secure)
    const twimlUrls = {
      'order-confirmation': context.TWIML_ORDER_CONFIRMATION_URL || 'https://demo.twilio.com/docs/voice.xml',
      'fraud-alert': context.TWIML_FRAUD_ALERT_URL || 'https://handler.twilio.com/twiml/EH80b05ba088ad47b84e99f253563c602e'
    };

    const twimlUrl = twimlUrls[event.call_type];
    if (!twimlUrl) {
      throw new Error('TwiML URL not configured for call type: ' + event.call_type);
    }

    console.log('Using TwiML URL:', twimlUrl, 'for call type:', event.call_type);

    // Make call
    const callSid = await twilioClient.makeCall(context, event.phone_number, twimlUrl);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: `Call initiated successfully to ${event.phone_number}`,
      callSid: callSid
    });

    return callback(null, response);
  } catch (error) {
    // Log detailed error server-side only
    console.error('Error making call:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details || error.moreInfo
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: 'Unable to initiate call. Please try again.'
    });

    return callback(null, response);
  }
};
