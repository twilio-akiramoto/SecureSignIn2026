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
  response.appendHeader('Access-Control-Allow-Origin', '*');

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
    // Return error response
    response.setStatusCode(200);
    response.setBody({
      valid: false,
      message: error.message || 'Phone number validation failed'
    });

    return callback(null, response);
  }
};
