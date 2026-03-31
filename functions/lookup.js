/**
 * Twilio Function: Phone Number Lookup
 * Validates phone numbers using Twilio Lookup v1 API
 *
 * Expected request:
 * - event.mobile_number: E.164 formatted phone number
 *
 * Response format:
 * - { valid: true, message: 'Valid phone number' } on success
 * - { valid: false, message: 'Error description' } on failure
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
    // Validate input
    if (!event.mobile_number) {
      response.setStatusCode(200);
      response.setBody({
        valid: false,
        message: 'Phone number is required'
      });
      return callback(null, response);
    }

    // Load Twilio client helper
    const twilioClient = require(Runtime.getFunctions()['helpers/twilio-client'].path);

    // Call Lookup v1 API
    const result = await twilioClient.lookupV1(context, event.mobile_number);

    // Return success response
    response.setStatusCode(200);
    response.setBody({
      valid: true,
      message: 'Valid phone number'
    });

    return callback(null, response);
  } catch (error) {
    // Log error server-side only
    console.error('Lookup validation error:', {
      code: error.code,
      status: error.status
    });

    // Return generic error message to client
    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: 'Unable to validate phone number. Please check the format and try again.'
    });

    return callback(null, response);
  }
};
