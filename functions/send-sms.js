/**
 * Send SMS Function
 * Sends SMS using Twilio Messaging API
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
    // Validate SMS type (whitelist)
    const validSmsTypes = ['order-confirmation', 'fraud-alert'];
    if (!event.sms_type || !validSmsTypes.includes(event.sms_type)) {
      response.setStatusCode(400);
      response.setBody({
        success: false,
        message: 'Invalid SMS type'
      });
      return callback(null, response);
    }

    // Validate phone number
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

    // Determine message based on SMS type (secure)
    const messages = {
      'order-confirmation': 'Your order has been confirmed!',
      'fraud-alert': 'Fraud alert test: you will receive alerts from this number.'
    };

    const message = messages[event.sms_type];

    // Send SMS
    const messageSid = await twilioClient.sendSMS(context, event.phone_number, message);

    response.setStatusCode(200);
    response.setBody({
      success: true,
      message: 'SMS sent successfully'
    });

    return callback(null, response);
  } catch (error) {
    // Log error server-side only
    console.error('Error sending SMS:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(500);
    response.setBody({
      success: false,
      message: 'Unable to send SMS. Please try again.'
    });

    return callback(null, response);
  }
};
